import "server-only";

import { cache } from "react";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import type { Papel } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";

// Camada de dados do Hub (clientes, dossiês, liberações, conteúdos e
// diretório de pessoas). Mesma regra do repo do Coins: quem decide o
// que cada papel vê é o RLS do banco (migration 0007); aqui só se lê o
// que sobra depois do filtro e se traduz o erro numa mensagem legível.

type Supabase = Awaited<ReturnType<typeof createClient>>;
interface ErroSupabase {
  code?: string;
  message: string;
}

/** O banco ainda não recebeu a migration do Hub (tabela ou função ausente). */
export class MigracaoPendenteError extends Error {
  constructor() {
    super("O banco ainda não tem as tabelas do Hub. Rode a migration 0007_hub_fundacao.sql no Supabase.");
    this.name = "MigracaoPendenteError";
  }
}

function faltaMigracao(e: ErroSupabase): boolean {
  return (
    ["42P01", "42883", "PGRST202", "PGRST205"].includes(e.code ?? "") ||
    /does not exist|schema cache/i.test(e.message)
  );
}

function lancarSeErro(error: ErroSupabase | null): void {
  if (!error) return;
  if (faltaMigracao(error)) throw new MigracaoPendenteError();
  if (/row-level security|permission denied/i.test(error.message)) {
    throw new Error("Sem permissão para esta ação com o seu papel atual.");
  }
  throw new Error(error.message);
}

async function registrarLog(
  supabase: Supabase,
  params: { acao: string; entidade: string; entidadeId?: string | null; valorAnterior?: unknown; valorNovo?: unknown }
): Promise<void> {
  const usuario = await obterUsuarioAutenticado();
  const { error } = await supabase.from("log").insert({
    usuario_id: usuario?.id ?? null,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidadeId ?? null,
    valor_anterior: params.valorAnterior ?? null,
    valor_novo: params.valorNovo ?? null,
  });
  if (error) console.error("Falha ao gravar log:", error.message);
}

// ---------------------------------------------------------------
// clientes
// ---------------------------------------------------------------

export type StatusCliente = "ativo" | "pausado" | "saiu";
export type ChaveLink = "relatorio" | "otimizacao" | "checkin" | "recorrencia" | "funil";

export interface ClienteRow {
  id: string;
  slug: string;
  nome: string;
  status: StatusCliente;
  assessorId: string | null;
  assessorImportado: string | null;
  squad: string | null;
  pacote: string | null;
  nicho: string | null;
  frase: string | null;
  objetivo: string | null;
  pedeAtencao: boolean;
  pilotoAssistente: boolean;
  exigenciaPts: number | null;
  links: Partial<Record<ChaveLink, string>>;
  dossieAbertoATodos: boolean;
  atualizadoEm: string;
}

interface ClienteDB {
  id: string;
  slug: string;
  nome: string;
  status: StatusCliente;
  assessor_id: string | null;
  assessor_importado: string | null;
  squad: string | null;
  pacote: string | null;
  nicho: string | null;
  frase: string | null;
  objetivo: string | null;
  pede_atencao: boolean;
  piloto_assistente: boolean;
  exigencia_pts: number | null;
  links: Record<string, unknown> | null;
  dossie_aberto_a_todos: boolean;
  atualizado_em: string;
}

const CHAVES_LINK: ChaveLink[] = ["relatorio", "otimizacao", "checkin", "recorrencia", "funil"];

/** Só links http(s) passam — o campo é texto livre no banco. */
function linksSeguros(bruto: Record<string, unknown> | null): Partial<Record<ChaveLink, string>> {
  const out: Partial<Record<ChaveLink, string>> = {};
  for (const k of CHAVES_LINK) {
    const v = bruto?.[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) out[k] = v;
  }
  return out;
}

function paraCliente(r: ClienteDB): ClienteRow {
  return {
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    status: r.status,
    assessorId: r.assessor_id,
    assessorImportado: r.assessor_importado,
    squad: r.squad,
    pacote: r.pacote,
    nicho: r.nicho,
    frase: r.frase,
    objetivo: r.objetivo,
    pedeAtencao: r.pede_atencao,
    pilotoAssistente: r.piloto_assistente,
    exigenciaPts: r.exigencia_pts,
    links: linksSeguros(r.links),
    dossieAbertoATodos: r.dossie_aberto_a_todos,
    atualizadoEm: r.atualizado_em,
  };
}

/** Todos os clientes que a pessoa logada pode ver (o RLS filtra). */
export const listarClientes = cache(async (): Promise<ClienteRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("*").order("nome");
  lancarSeErro(error);
  return ((data ?? []) as ClienteDB[]).map(paraCliente);
});

/** Ids dos clientes que já têm dossiê escrito (entre os visíveis). */
export const clientesComDossie = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dossies").select("cliente_id");
  lancarSeErro(error);
  return new Set(((data ?? []) as { cliente_id: string }[]).map((d) => d.cliente_id));
});

export interface DossieRow {
  clienteId: string;
  conteudoMd: string;
  versao: number;
  atualizadoEm: string;
}

export async function obterClientePorSlug(
  slug: string
): Promise<{ cliente: ClienteRow; dossie: DossieRow | null } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clientes").select("*").eq("slug", slug).maybeSingle();
  lancarSeErro(error);
  if (!data) return null;
  const cliente = paraCliente(data as ClienteDB);

  const d = await supabase
    .from("dossies")
    .select("cliente_id, conteudo_md, versao, atualizado_em")
    .eq("cliente_id", cliente.id)
    .maybeSingle();
  lancarSeErro(d.error);
  const dossie = d.data
    ? {
        clienteId: d.data.cliente_id as string,
        conteudoMd: d.data.conteudo_md as string,
        versao: d.data.versao as number,
        atualizadoEm: d.data.atualizado_em as string,
      }
    : null;
  return { cliente, dossie };
}

export interface PatchCliente {
  nome?: string;
  status?: StatusCliente;
  assessorId?: string | null;
  squad?: string | null;
  pacote?: string | null;
  nicho?: string | null;
  frase?: string | null;
  objetivo?: string | null;
  pedeAtencao?: boolean;
  exigenciaPts?: number | null;
  links?: Partial<Record<ChaveLink, string>>;
}

export async function atualizarCliente(id: string, patch: PatchCliente): Promise<void> {
  const supabase = await createClient();
  const db: Record<string, unknown> = {};
  if (patch.nome !== undefined) db.nome = patch.nome.trim();
  if (patch.status !== undefined) db.status = patch.status;
  if (patch.assessorId !== undefined) db.assessor_id = patch.assessorId;
  if (patch.squad !== undefined) db.squad = patch.squad;
  if (patch.pacote !== undefined) db.pacote = patch.pacote;
  if (patch.nicho !== undefined) db.nicho = patch.nicho;
  if (patch.frase !== undefined) db.frase = patch.frase;
  if (patch.objetivo !== undefined) db.objetivo = patch.objetivo;
  if (patch.pedeAtencao !== undefined) db.pede_atencao = patch.pedeAtencao;
  if (patch.exigenciaPts !== undefined) db.exigencia_pts = patch.exigenciaPts;
  if (patch.links !== undefined) db.links = linksSeguros(patch.links as Record<string, unknown>);

  // `.select()` devolve as linhas afetadas: zero linhas = o RLS barrou.
  const { data, error } = await supabase.from("clientes").update(db).eq("id", id).select("id");
  lancarSeErro(error);
  if (!data?.length) throw new Error("Sem permissão para editar este cliente.");
  await registrarLog(supabase, { acao: "atualizar_cliente", entidade: "cliente", entidadeId: id, valorNovo: patch });
}

export async function salvarDossie(clienteId: string, conteudoMd: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dossies")
    .upsert({ cliente_id: clienteId, conteudo_md: conteudoMd }, { onConflict: "cliente_id" })
    .select("versao");
  lancarSeErro(error);
  if (!data?.length) throw new Error("Sem permissão para editar este dossiê.");
  await registrarLog(supabase, {
    acao: "salvar_dossie",
    entidade: "cliente",
    entidadeId: clienteId,
    valorNovo: { versao: data[0].versao },
  });
}

// ---------------------------------------------------------------
// liberação de dossiês (só diretoria escreve — RLS)
// ---------------------------------------------------------------

export async function listarLiberacoes(clienteId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dossie_liberacoes").select("assessor_id").eq("cliente_id", clienteId);
  lancarSeErro(error);
  return ((data ?? []) as { assessor_id: string }[]).map((l) => l.assessor_id);
}

export async function definirLiberacoes(
  clienteId: string,
  assessorIds: string[],
  abertoATodos: boolean
): Promise<void> {
  const supabase = await createClient();
  const anteriores = await listarLiberacoes(clienteId);
  const sair = anteriores.filter((a) => !assessorIds.includes(a));
  const entrar = assessorIds.filter((a) => !anteriores.includes(a));

  if (sair.length) {
    const { error } = await supabase
      .from("dossie_liberacoes")
      .delete()
      .eq("cliente_id", clienteId)
      .in("assessor_id", sair);
    lancarSeErro(error);
  }
  if (entrar.length) {
    const { error } = await supabase
      .from("dossie_liberacoes")
      .insert(entrar.map((assessorId) => ({ cliente_id: clienteId, assessor_id: assessorId })));
    lancarSeErro(error);
  }
  const { data, error } = await supabase
    .from("clientes")
    .update({ dossie_aberto_a_todos: abertoATodos })
    .eq("id", clienteId)
    .select("id");
  lancarSeErro(error);
  if (!data?.length) throw new Error("Sem permissão para liberar este dossiê.");

  await registrarLog(supabase, {
    acao: "liberar_dossie",
    entidade: "cliente",
    entidadeId: clienteId,
    valorAnterior: { assessorIds: anteriores },
    valorNovo: { assessorIds, abertoATodos },
  });
}

// ---------------------------------------------------------------
// diretório (nomes de quem está ativo — sem nível nem saldo)
// ---------------------------------------------------------------

export interface PessoaDiretorio {
  id: string;
  nome: string;
  cargo: string | null;
  papel: Papel;
  assessorId: string | null;
}

export const diretorioAssessores = cache(async (): Promise<{ id: string; nome: string }[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("diretorio_assessores");
  lancarSeErro(error);
  return (data ?? []) as { id: string; nome: string }[];
});

export const diretorioPessoas = cache(async (): Promise<PessoaDiretorio[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("diretorio_pessoas");
  lancarSeErro(error);
  return ((data ?? []) as { id: string; nome: string; cargo: string | null; papel: Papel; assessor_id: string | null }[]).map(
    (p) => ({ id: p.id, nome: p.nome, cargo: p.cargo, papel: p.papel, assessorId: p.assessor_id })
  );
});

export async function atualizarPessoa(
  usuarioId: string,
  patch: { nome?: string | null; cargo?: string | null; clickupUserId?: number | null; telefone?: string | null }
): Promise<void> {
  const supabase = await createClient();
  const db: Record<string, unknown> = {};
  if (patch.nome !== undefined) db.nome = patch.nome?.trim() || null;
  if (patch.cargo !== undefined) db.cargo = patch.cargo?.trim() || null;
  if (patch.clickupUserId !== undefined) db.clickup_user_id = patch.clickupUserId;
  if (patch.telefone !== undefined) db.telefone = patch.telefone?.trim() || null;
  const { data, error } = await supabase.from("usuarios").update(db).eq("id", usuarioId).select("id");
  lancarSeErro(error);
  if (!data?.length) throw new Error("Sem permissão para editar esta pessoa.");
  await registrarLog(supabase, { acao: "atualizar_pessoa", entidade: "usuario", entidadeId: usuarioId, valorNovo: patch });
}

// ---------------------------------------------------------------
// conteúdos (Trilha do Assessor)
// ---------------------------------------------------------------

export interface ConteudoRow {
  id: string;
  slug: string;
  secao: string;
  ordem: number;
  etapa: string | null;
  titulo: string;
  resumo: string | null;
  corpoMd: string;
  publicado: boolean;
  atualizadoEm: string;
}

interface ConteudoDB {
  id: string;
  slug: string;
  secao: string;
  ordem: number;
  etapa: string | null;
  titulo: string;
  resumo: string | null;
  corpo_md: string;
  publicado: boolean;
  atualizado_em: string;
}

function paraConteudo(r: ConteudoDB): ConteudoRow {
  return {
    id: r.id,
    slug: r.slug,
    secao: r.secao,
    ordem: r.ordem,
    etapa: r.etapa,
    titulo: r.titulo,
    resumo: r.resumo,
    corpoMd: r.corpo_md,
    publicado: r.publicado,
    atualizadoEm: r.atualizado_em,
  };
}

export const listarConteudos = cache(async (secao = "trilha"): Promise<ConteudoRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conteudos")
    .select("*")
    .eq("secao", secao)
    .order("ordem")
    .order("titulo");
  lancarSeErro(error);
  return ((data ?? []) as ConteudoDB[]).map(paraConteudo);
});

export async function obterConteudo(slug: string): Promise<ConteudoRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("conteudos").select("*").eq("slug", slug).maybeSingle();
  lancarSeErro(error);
  return data ? paraConteudo(data as ConteudoDB) : null;
}

export async function salvarConteudo(
  id: string,
  patch: { titulo?: string; resumo?: string | null; etapa?: string | null; corpoMd?: string; publicado?: boolean }
): Promise<void> {
  const supabase = await createClient();
  const db: Record<string, unknown> = {};
  if (patch.titulo !== undefined) db.titulo = patch.titulo.trim();
  if (patch.resumo !== undefined) db.resumo = patch.resumo;
  if (patch.etapa !== undefined) db.etapa = patch.etapa;
  if (patch.corpoMd !== undefined) db.corpo_md = patch.corpoMd;
  if (patch.publicado !== undefined) db.publicado = patch.publicado;
  const { data, error } = await supabase.from("conteudos").update(db).eq("id", id).select("id");
  lancarSeErro(error);
  if (!data?.length) throw new Error("Sem permissão para editar este conteúdo.");
  await registrarLog(supabase, {
    acao: "salvar_conteudo",
    entidade: "conteudo",
    entidadeId: id,
    valorNovo: { ...patch, corpoMd: patch.corpoMd ? `${patch.corpoMd.length} caracteres` : undefined },
  });
}

/** Pares (cliente, assessor) liberados que a pessoa pode ler — assessor só vê os dele (RLS). */
export const listarTodasLiberacoes = cache(async (): Promise<{ clienteId: string; assessorId: string }[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("dossie_liberacoes").select("cliente_id, assessor_id");
  lancarSeErro(error);
  return ((data ?? []) as { cliente_id: string; assessor_id: string }[]).map((l) => ({
    clienteId: l.cliente_id,
    assessorId: l.assessor_id,
  }));
});

/** Texto dos dossiês de vários clientes de uma vez (para a rotina do dia). */
export async function obterDossiesDe(clienteIds: string[]): Promise<Map<string, string>> {
  if (clienteIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("dossies").select("cliente_id, conteudo_md").in("cliente_id", clienteIds);
  lancarSeErro(error);
  return new Map(((data ?? []) as { cliente_id: string; conteudo_md: string }[]).map((d) => [d.cliente_id, d.conteudo_md]));
}
