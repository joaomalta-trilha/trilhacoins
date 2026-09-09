// Tipos de domínio do motor de cálculo do TrilhaCoins.
// Espelham o modelo de dados do briefing (§4) para que as tabelas
// `metas` / `faixas_pontuacao` / `niveis` do banco sejam apenas dados,
// não código.

export type TipoMeta = "escala" | "percentual" | "contagem" | "livre";
export type GrupoMeta = "recorrente" | "bonus";

export interface FaixaPontuacao {
  rotulo: string;
  /** limite inferior (inclusive) — usado só em metas do tipo "percentual" */
  valorMinimo?: number;
  coins: number;
  ordem: number;
}

export interface Meta {
  codigo: string; // "3.1" ... "3.9"
  nome: string;
  descricao?: string;
  tipo: TipoMeta;
  grupo: GrupoMeta;
  /** teto de coins da meta; null quando não há teto (bônus) */
  teto: number | null;
  ordem: number;
  /** só para tipo "contagem": coins por unidade lançada */
  porUnidade?: number;
  faixas: FaixaPontuacao[];
}

/** valor bruto lançado para uma meta: rótulo de escala, percentual, contagem ou coins livres */
export type ValorLancamento = string | number | undefined | null;

export type Lancamentos = Record<string, ValorLancamento>; // metaCodigo -> valor

export interface Nivel {
  codigo: string;
  nome: string;
  ordem: number;
  /** custo, em coins, para sair deste nível rumo ao próximo. null no nível máximo (Partner). */
  custoPromocao: number | null;
}

/** transições que exigem pré-requisito qualitativo além do saldo (§5.4) */
export interface RequisitoMacroNivel {
  nivelOrigem: string;
  descricao: string;
}

export const BASE_MENSAL = 1300;
