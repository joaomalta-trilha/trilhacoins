"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as hub from "@/lib/data/hub";
import { COOKIE_MODO, COOKIE_VER_COMO, type Modo, paginaInicial } from "@/lib/hub/navegacao";
import { aplicarRespostas, statusDoCadastro, validarRespostas } from "@/lib/hub/formulario-dossie";

// Server Actions do Hub. São endpoints públicos: validam a forma do que
// chega e devolvem { ok } previsível; quem decide se a pessoa PODE é o
// RLS do banco (migration 0007) — aqui não há regra de permissão.

type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(erro: unknown): Resultado {
  return { ok: false, erro: erro instanceof Error ? erro.message : "Erro inesperado." };
}

const UM_ANO = 60 * 60 * 24 * 365;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuid(v: unknown): string {
  if (typeof v !== "string" || !RE_UUID.test(v)) throw new Error("Identificador inválido.");
  return v;
}

function textoOuNulo(v: unknown, max = 2000): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") throw new Error("Valor de texto inválido.");
  const t = v.trim();
  if (t.length > max) throw new Error(`Texto maior que ${max} caracteres.`);
  return t || null;
}

// ---------------------------------------------------------------
// experiência (gestão × assessor)
// ---------------------------------------------------------------

export async function trocarModoAction(modo: Modo): Promise<void> {
  const valor: Modo = modo === "assessor" ? "assessor" : "gestao";
  (await cookies()).set(COOKIE_MODO, valor, { path: "/", httpOnly: true, sameSite: "lax", maxAge: UM_ANO });
  redirect(paginaInicial(valor));
}

export async function verComoAction(assessorId: string): Promise<Resultado> {
  try {
    (await cookies()).set(COOKIE_VER_COMO, uuid(assessorId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: UM_ANO,
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// ---------------------------------------------------------------
// clientes e dossiês
// ---------------------------------------------------------------

const STATUS: hub.StatusCliente[] = ["ativo", "pausado", "saiu"];
const CHAVES_LINK: hub.ChaveLink[] = ["relatorio", "otimizacao", "checkin", "recorrencia", "funil"];

export async function atualizarClienteAction(id: string, slug: string, patch: hub.PatchCliente): Promise<Resultado> {
  try {
    const limpo: hub.PatchCliente = {};
    if (patch.nome !== undefined) {
      const nome = textoOuNulo(patch.nome, 120);
      if (!nome) throw new Error("O cliente precisa de um nome.");
      limpo.nome = nome;
    }
    if (patch.status !== undefined) {
      if (!STATUS.includes(patch.status)) throw new Error("Status inválido.");
      limpo.status = patch.status;
    }
    if (patch.assessorId !== undefined) limpo.assessorId = patch.assessorId === null ? null : uuid(patch.assessorId);
    for (const campo of ["squad", "pacote", "nicho", "frase", "objetivo"] as const) {
      if (patch[campo] !== undefined) limpo[campo] = textoOuNulo(patch[campo], campo === "frase" || campo === "objetivo" ? 600 : 80);
    }
    if (patch.pedeAtencao !== undefined) limpo.pedeAtencao = Boolean(patch.pedeAtencao);
    if (patch.exigenciaPts !== undefined) {
      const p = patch.exigenciaPts;
      if (p !== null && !(Number.isInteger(p) && p >= 7 && p <= 25)) {
        throw new Error("A nota de exigência vai de 7 a 25 pontos.");
      }
      limpo.exigenciaPts = p;
    }
    if (patch.links !== undefined) {
      const links: Partial<Record<hub.ChaveLink, string>> = {};
      for (const k of CHAVES_LINK) {
        const v = textoOuNulo(patch.links?.[k], 500);
        if (v && !/^https?:\/\//i.test(v)) throw new Error("Os atalhos precisam começar com https://");
        if (v) links[k] = v;
      }
      limpo.links = links;
    }
    await hub.atualizarCliente(uuid(id), limpo);
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${encodeURIComponent(slug)}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function salvarDossieAction(clienteId: string, slug: string, conteudoMd: string): Promise<Resultado> {
  try {
    if (typeof conteudoMd !== "string") throw new Error("Conteúdo inválido.");
    if (conteudoMd.length > 200_000) throw new Error("O dossiê passou de 200 mil caracteres.");
    await hub.salvarDossie(uuid(clienteId), conteudoMd);
    revalidatePath(`/clientes/${encodeURIComponent(slug)}`);
    revalidatePath("/clientes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function definirLiberacoesAction(
  clienteId: string,
  slug: string,
  assessorIds: string[],
  abertoATodos: boolean
): Promise<Resultado> {
  try {
    if (!Array.isArray(assessorIds)) throw new Error("Lista de assessores inválida.");
    await hub.definirLiberacoes(uuid(clienteId), [...new Set(assessorIds.map(uuid))], Boolean(abertoATodos));
    revalidatePath(`/clientes/${encodeURIComponent(slug)}`);
    revalidatePath("/clientes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// ---------------------------------------------------------------
// criar, excluir e preencher o dossiê de clientes
// ---------------------------------------------------------------

export async function criarClienteAction(entrada: {
  nome?: string;
  assessorId?: string | null;
  status?: string;
  squad?: string | null;
  pacote?: string | null;
  nicho?: string | null;
  frase?: string | null;
  exigenciaPts?: number | null;
}): Promise<{ ok: true; slug: string } | { ok: false; erro: string }> {
  try {
    const nome = textoOuNulo(entrada.nome, 120);
    if (!nome) throw new Error("O cliente precisa de um nome.");
    const status = entrada.status ?? "ativo";
    if (!STATUS.includes(status as hub.StatusCliente)) throw new Error("Status inválido.");
    const p = entrada.exigenciaPts ?? null;
    if (p !== null && !(Number.isInteger(p) && p >= 7 && p <= 25)) throw new Error("A nota de exigência vai de 7 a 25 pontos.");
    const criado = await hub.criarCliente({
      nome,
      assessorId: entrada.assessorId ? uuid(entrada.assessorId) : null,
      status: status as hub.StatusCliente,
      squad: textoOuNulo(entrada.squad, 80),
      pacote: textoOuNulo(entrada.pacote, 80),
      nicho: textoOuNulo(entrada.nicho, 80),
      frase: textoOuNulo(entrada.frase, 600),
      exigenciaPts: p,
    });
    revalidatePath("/clientes");
    revalidatePath("/gestao");
    return { ok: true, slug: criado.slug };
  } catch (e) {
    return paraResultado(e) as { ok: false; erro: string };
  }
}

export async function excluirClienteAction(clienteId: string): Promise<Resultado> {
  try {
    await hub.excluirCliente(uuid(clienteId));
    revalidatePath("/clientes");
    revalidatePath("/gestao");
    revalidatePath("/inicio");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

/** Respostas do formulário nativo → linhas do dossiê (o resto do dossiê fica como está). */
export async function salvarFormularioDossieAction(clienteId: string, slug: string, respostas: unknown): Promise<Resultado> {
  try {
    const r = validarRespostas(respostas);
    const dados = await hub.obterClientePorSlug(slug);
    if (!dados || dados.cliente.id !== uuid(clienteId)) throw new Error("Cliente não encontrado.");
    const { cliente, dossie } = dados;
    const assessor = cliente.assessorId
      ? ((await hub.diretorioAssessores()).find((a) => a.id === cliente.assessorId)?.nome ?? null)
      : null;
    const md = aplicarRespostas(dossie?.conteudoMd ?? null, r, {
      nome: cliente.nome,
      squad: cliente.squad,
      assessor,
      frase: cliente.frase,
    });
    if (md.length > 200_000) throw new Error("O dossiê passou de 200 mil caracteres.");
    if (md !== dossie?.conteudoMd) await hub.salvarDossie(cliente.id, md);
    const status = statusDoCadastro(r.status);
    if (status !== cliente.status) await hub.atualizarCliente(cliente.id, { status });
    revalidatePath(`/clientes/${encodeURIComponent(slug)}`);
    revalidatePath("/clientes");
    revalidatePath("/inicio");
    revalidatePath("/gestao");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// ---------------------------------------------------------------
// pessoas
// ---------------------------------------------------------------

export async function atualizarPessoaAction(
  usuarioId: string,
  patch: { nome?: string | null; cargo?: string | null; clickupUserId?: string | null; telefone?: string | null }
): Promise<Resultado> {
  try {
    const limpo: Parameters<typeof hub.atualizarPessoa>[1] = {};
    if (patch.nome !== undefined) limpo.nome = textoOuNulo(patch.nome, 80);
    if (patch.cargo !== undefined) limpo.cargo = textoOuNulo(patch.cargo, 80);
    if (patch.telefone !== undefined) limpo.telefone = textoOuNulo(patch.telefone, 30);
    if (patch.clickupUserId !== undefined) {
      const t = textoOuNulo(patch.clickupUserId, 20);
      if (t && !/^\d+$/.test(t)) throw new Error("O ID do ClickUp tem só números.");
      limpo.clickupUserId = t ? Number(t) : null;
    }
    await hub.atualizarPessoa(uuid(usuarioId), limpo);
    revalidatePath("/gestao/usuarios");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// ---------------------------------------------------------------
// conteúdos da Trilha
// ---------------------------------------------------------------

export async function salvarConteudoAction(
  id: string,
  slug: string,
  patch: { titulo?: string; resumo?: string | null; corpoMd?: string; publicado?: boolean }
): Promise<Resultado> {
  try {
    const limpo: Parameters<typeof hub.salvarConteudo>[1] = {};
    if (patch.titulo !== undefined) {
      const t = textoOuNulo(patch.titulo, 120);
      if (!t) throw new Error("O conteúdo precisa de um título.");
      limpo.titulo = t;
    }
    if (patch.resumo !== undefined) limpo.resumo = textoOuNulo(patch.resumo, 400);
    if (patch.corpoMd !== undefined) {
      if (typeof patch.corpoMd !== "string" || patch.corpoMd.length > 200_000) throw new Error("Conteúdo inválido.");
      limpo.corpoMd = patch.corpoMd;
    }
    if (patch.publicado !== undefined) limpo.publicado = Boolean(patch.publicado);
    await hub.salvarConteudo(uuid(id), limpo);
    revalidatePath("/trilha");
    revalidatePath(`/trilha/${encodeURIComponent(slug)}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

// ---------------------------------------------------------------
// remover e restaurar usuários (só diretoria — a trava é do banco)
// ---------------------------------------------------------------

export async function removerUsuarioAction(
  usuarioId: string
): Promise<{ ok: true; modo: hub.ModoRemocao } | { ok: false; erro: string }> {
  try {
    const modo = await hub.removerUsuario(uuid(usuarioId));
    revalidatePath("/gestao/usuarios");
    revalidatePath("/gestao");
    revalidatePath("/coins/ajustes");
    return { ok: true, modo };
  } catch (e) {
    return paraResultado(e) as { ok: false; erro: string };
  }
}

export async function restaurarUsuarioAction(usuarioId: string): Promise<Resultado> {
  try {
    await hub.restaurarUsuario(uuid(usuarioId));
    revalidatePath("/gestao/usuarios");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}
