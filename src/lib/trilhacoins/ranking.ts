import { METAS } from "./metas";
import { totalRecorrente } from "./pontuacao";
import type { Lancamentos, Meta } from "./types";
import { BASE_MENSAL } from "./types";

export interface AssessorRanking {
  assessorId: string;
  nome: string;
  lancamentos: Lancamentos | undefined | null;
}

export interface EntradaPctBase {
  assessorId: string;
  nome: string;
  pctBase: number;
}

export interface PosicaoRanking {
  assessorId: string;
  nome: string;
  posicao: number; // 1-based
  pctBase: number;
  /** só true para as 3 primeiras posições — as únicas nomeadas para o time (§7) */
  nomeado: boolean;
}

/** Ordena por % da base (maior primeiro) e atribui posição + pódio. Núcleo comum das duas formas de montar o ranking abaixo. */
function montarPosicoes(entradas: EntradaPctBase[]): PosicaoRanking[] {
  const ordenado = [...entradas].sort((a, b) => b.pctBase - a.pctBase);
  return ordenado.map((e, i) => ({
    assessorId: e.assessorId,
    nome: e.nome,
    posicao: i + 1,
    pctBase: e.pctBase,
    nomeado: i < 3,
  }));
}

/**
 * Ranking do mês por % da base recorrente — a única métrica em que
 * todos disputam o mesmo teto (1.300), independente de nível. Do
 * time, só o pódio (top 3) é nomeado; abaixo disso, ninguém.
 */
export function calcularRankingMes(
  assessores: AssessorRanking[],
  metas: Meta[] = METAS
): PosicaoRanking[] {
  return montarPosicoes(
    assessores.map((a) => ({
      assessorId: a.assessorId,
      nome: a.nome,
      pctBase: (totalRecorrente(metas, a.lancamentos) / BASE_MENSAL) * 100,
    }))
  );
}

/**
 * Mesma montagem (ordenar, posicionar, marcar pódio), mas a partir de
 * um % da base já calculado por fora — usada quando quem chama não tem
 * acesso aos lançamentos brutos dos colegas para recalcular (ex.: uma
 * sessão de assessor, que só enxerga os próprios lançamentos via RLS e
 * recebe o % de cada colega já agregado por uma function do banco).
 */
export function montarRankingDePctBase(entradas: EntradaPctBase[]): PosicaoRanking[] {
  return montarPosicoes(entradas);
}

/** Visão restrita ao próprio assessor: pódio nomeado + a própria posição, nunca o resto. */
export function rankingParaAssessor(
  ranking: PosicaoRanking[],
  assessorId: string
): { podio: PosicaoRanking[]; minhaPosicao: PosicaoRanking | undefined } {
  return {
    podio: ranking.filter((r) => r.nomeado),
    minhaPosicao: ranking.find((r) => r.assessorId === assessorId),
  };
}
