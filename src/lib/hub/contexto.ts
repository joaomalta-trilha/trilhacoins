import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { obterSessao, type SessaoUsuario } from "@/lib/auth/sessao";
import { listarAssessoresAtivos } from "@/lib/data/repo";
import { COOKIE_MODO, COOKIE_VER_COMO, type Modo, modoEfetivo, podeTrocarModo } from "./navegacao";

export interface ContextoHub {
  sessao: SessaoUsuario;
  modo: Modo;
  podeTrocarModo: boolean;
  /**
   * De quem é a experiência de assessor que está na tela: o próprio
   * assessor, ou — para coordenação/diretoria em "ver como assessor" —
   * o assessor escolhido (só entre os que o RLS deixa ler).
   */
  assessorAlvo: { id: string; nome: string; nivel: string | null } | null;
  /** opções do seletor "ver como" (vazio para quem é assessor) */
  opcoesVerComo: { id: string; nome: string }[];
}

export const obterContexto = cache(async (): Promise<ContextoHub | null> => {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const jar = await cookies();
  const modo = modoEfetivo(sessao.papel, jar.get(COOKIE_MODO)?.value);
  const base = { sessao, modo, podeTrocarModo: podeTrocarModo(sessao.papel) };

  if (modo === "gestao") return { ...base, assessorAlvo: null, opcoesVerComo: [] };

  // Assessor (ou gestão vendo como assessor): o RLS de `assessores` já
  // devolve só quem a pessoa pode ler — o próprio, a carteira da
  // coordenação, ou todos para a diretoria.
  const assessores = await listarAssessoresAtivos().catch(() => []);
  if (sessao.papel === "assessor") {
    const proprio = assessores.find((a) => a.id === sessao.assessorId);
    return {
      ...base,
      assessorAlvo: sessao.assessorId
        ? { id: sessao.assessorId, nome: proprio?.nome ?? sessao.nome, nivel: proprio?.nivel ?? null }
        : null,
      opcoesVerComo: [],
    };
  }

  const escolhido = jar.get(COOKIE_VER_COMO)?.value;
  const alvo =
    assessores.find((a) => a.id === escolhido) ??
    assessores.find((a) => a.id === sessao.assessorId) ??
    assessores[0] ??
    null;
  return {
    ...base,
    assessorAlvo: alvo ? { id: alvo.id, nome: alvo.nome, nivel: alvo.nivel } : null,
    opcoesVerComo: assessores.map((a) => ({ id: a.id, nome: a.nome })),
  };
});
