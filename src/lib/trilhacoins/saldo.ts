// §5.5 — saldo do assessor.

export interface ApuracaoFechada {
  mes: string; // "AAAA-MM"
  coinsRecorrente: number;
  coinsBonus: number;
}

export interface PromocaoEfetivada {
  custo: number;
}

/**
 * saldo = saldo_inicial + Σ coins de todas as apurações fechadas
 *       − Σ custos das promoções efetivadas
 *
 * Só apurações com status "fechada" contam — um lançamento em mês
 * aberto não altera o saldo até o fechamento (§5.5, §7). O
 * remanescente nunca é zerado após uma promoção: é subtração simples,
 * cumulativa.
 */
export function calcularSaldo(params: {
  saldoInicial: number;
  apuracoesFechadas: ApuracaoFechada[];
  promocoesEfetivadas: PromocaoEfetivada[];
}): number {
  const ganho = params.apuracoesFechadas.reduce(
    (s, a) => s + a.coinsRecorrente + a.coinsBonus,
    0
  );
  const gasto = params.promocoesEfetivadas.reduce((s, p) => s + p.custo, 0);
  return params.saldoInicial + ganho - gasto;
}

/** pct_nivel = min(100, saldo / custo_da_transicao × 100). Nível máximo (custo null) = 100%. */
export function pctNivel(saldo: number, custoTransicao: number | null): number {
  if (custoTransicao === null || custoTransicao <= 0) return 100;
  return Math.min(100, (saldo / custoTransicao) * 100);
}

export function faltaCoins(saldo: number, custoTransicao: number | null): number {
  if (custoTransicao === null) return 0;
  return Math.max(0, custoTransicao - saldo);
}

export function aptoPorSaldo(saldo: number, custoTransicao: number | null): boolean {
  if (custoTransicao === null) return false;
  return saldo >= custoTransicao;
}
