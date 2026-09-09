import { BASE_MENSAL } from "./types";

export interface MesLancado {
  mes: string;
  coinsRecorrente: number;
  coinsBonus: number;
}

/**
 * Ambas as métricas abaixo recebem apenas meses com apuração fechada
 * *e* lançamento registrado. Um mês sem lançamento não é um mês com
 * zero coins — são coisas diferentes (§9) — então cabe a quem monta
 * essa lista excluir apurações fechadas sem nenhum lançamento, em vez
 * de tratá-las como zero.
 */

/** Média mensal — últimos 3 meses lançados. Métrica histórica; não é base de projeção. */
export function mediaMensal(ultimosMesesLancados: MesLancado[]): number {
  if (ultimosMesesLancados.length === 0) return 0;
  const soma = ultimosMesesLancados.reduce(
    (s, m) => s + m.coinsRecorrente + m.coinsBonus,
    0
  );
  return soma / ultimosMesesLancados.length;
}

/** Aproveitamento = Σ recorrente / (1.300 × meses lançados) × 100 */
export function aproveitamento(mesesLancados: MesLancado[]): number {
  if (mesesLancados.length === 0) return 0;
  const somaRecorrente = mesesLancados.reduce((s, m) => s + m.coinsRecorrente, 0);
  return (somaRecorrente / (BASE_MENSAL * mesesLancados.length)) * 100;
}
