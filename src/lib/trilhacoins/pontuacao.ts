import type { Lancamentos, Meta, ValorLancamento } from "./types";

/**
 * Coins gerados por uma única meta, dado o valor lançado.
 * Espelha exatamente a regra de cada `tipo` (§5.2/§5.3):
 * - escala: rótulo bate com uma faixa
 * - percentual: primeira faixa cujo `valorMinimo` o valor atinge
 * - contagem: quantidade × coins por unidade (ex.: indicações, 3.8)
 * - livre: o valor lançado já é a quantidade de coins (ex.: certificações, 3.9)
 */
export function coinsDaMeta(meta: Meta, valor: ValorLancamento): number {
  if (valor === undefined || valor === null || valor === "") return 0;

  switch (meta.tipo) {
    case "escala": {
      const faixa = meta.faixas.find((f) => f.rotulo === valor);
      return faixa ? faixa.coins : 0;
    }
    case "percentual": {
      const p = Number(valor);
      if (Number.isNaN(p)) return 0;
      const faixa = [...meta.faixas]
        .sort((a, b) => (b.valorMinimo ?? 0) - (a.valorMinimo ?? 0))
        .find((f) => p >= (f.valorMinimo ?? 0));
      return faixa ? faixa.coins : 0;
    }
    case "contagem": {
      const qtd = Number(valor);
      if (Number.isNaN(qtd)) return 0;
      return qtd * (meta.porUnidade ?? 0);
    }
    case "livre": {
      const coins = Number(valor);
      return Number.isNaN(coins) ? 0 : coins;
    }
    default:
      return 0;
  }
}

/**
 * Soma dos coins das metas recorrentes — entra no teto de 1.300/mês.
 * `metas` é sempre recebido de fora (a tabela vigente, vinda do banco
 * em produção) para que uma mudança de pontuação seja dado, não deploy.
 */
export function totalRecorrente(
  metas: Meta[],
  lancamentos: Lancamentos | undefined | null
): number {
  return metas
    .filter((m) => m.grupo === "recorrente")
    .reduce((s, m) => s + coinsDaMeta(m, lancamentos?.[m.codigo]), 0);
}

/** Soma dos coins das metas de bônus — sem teto, não entra no % da base. */
export function totalBonus(
  metas: Meta[],
  lancamentos: Lancamentos | undefined | null
): number {
  return metas
    .filter((m) => m.grupo === "bonus")
    .reduce((s, m) => s + coinsDaMeta(m, lancamentos?.[m.codigo]), 0);
}

export function totalMes(metas: Meta[], lancamentos: Lancamentos | undefined | null): number {
  return totalRecorrente(metas, lancamentos) + totalBonus(metas, lancamentos);
}
