"use server";

import { revalidatePath } from "next/cache";
import * as repo from "@/lib/data/repo";
import type { Papel } from "@/lib/auth/sessao";

// Cada ação devolve { ok } em vez de deixar o erro estourar: o retorno
// de uma Server Action é serializado pro cliente, então a forma tem que
// ser previsível (guia de mutações do Next, seção "Constrain return
// values"). A autorização de verdade é o RLS do banco (0002_rls.sql) —
// aqui só embrulhamos o erro numa mensagem legível.
type Resultado = { ok: true } | { ok: false; erro: string };

function paraResultado(erro: unknown): Resultado {
  return { ok: false, erro: erro instanceof Error ? erro.message : "Erro inesperado." };
}

export async function lancarMetaAction(params: {
  assessorId: string;
  mes: string;
  metaCodigo: string;
  valor: string;
}): Promise<Resultado> {
  try {
    await repo.lancarMeta(params);
    revalidatePath("/lancar");
    revalidatePath("/equipe");
    revalidatePath(`/assessor/${params.assessorId}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function limparLancamentoAction(assessorId: string, mes: string): Promise<Resultado> {
  try {
    await repo.limparLancamentosDoAssessorNoMes(assessorId, mes);
    revalidatePath("/lancar");
    revalidatePath("/equipe");
    revalidatePath(`/assessor/${assessorId}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function fecharMesAction(mes: string): Promise<Resultado> {
  try {
    await repo.fecharMes(mes);
    revalidatePath("/lancar");
    revalidatePath("/equipe");
    revalidatePath("/assessor/[id]", "page");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function reabrirMesAction(mes: string): Promise<Resultado> {
  try {
    await repo.reabrirMes(mes);
    revalidatePath("/lancar");
    revalidatePath("/equipe");
    revalidatePath("/assessor/[id]", "page");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function efetivarPromocaoAction(assessorId: string): Promise<Resultado> {
  try {
    await repo.efetivarPromocao(assessorId);
    revalidatePath("/equipe");
    revalidatePath("/ajustes");
    revalidatePath(`/assessor/${assessorId}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function marcarRequisitoMacroAction(
  assessorId: string,
  nivel: string,
  atendido: boolean
): Promise<Resultado> {
  try {
    await repo.marcarRequisitoMacro(assessorId, nivel, atendido);
    revalidatePath("/equipe");
    revalidatePath(`/assessor/${assessorId}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function atualizarAssessorAction(
  id: string,
  patch: { nome?: string; nivel?: string; saldoInicial?: number; ativo?: boolean }
): Promise<Resultado> {
  try {
    await repo.atualizarAssessor(id, patch);
    revalidatePath("/equipe");
    revalidatePath("/ajustes");
    revalidatePath(`/assessor/${id}`);
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function atualizarUsuarioAction(
  id: string,
  patch: { papel?: Papel; assessorId?: string | null; ativo?: boolean }
): Promise<Resultado> {
  try {
    await repo.atualizarUsuario(id, patch);
    revalidatePath("/ajustes");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function atualizarCarteiraAction(usuarioId: string, assessorIds: string[]): Promise<Resultado> {
  try {
    await repo.atualizarCarteiraCoordenador(usuarioId, assessorIds);
    revalidatePath("/ajustes");
    revalidatePath("/equipe");
    revalidatePath("/lancar");
    return { ok: true };
  } catch (e) {
    return paraResultado(e);
  }
}

export async function exportarDadosJSONAction(): Promise<
  { ok: true; json: string } | { ok: false; erro: string }
> {
  try {
    const json = await repo.exportarDadosJSON();
    return { ok: true, json };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado." };
  }
}
