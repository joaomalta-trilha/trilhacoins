import { describe, expect, it } from "vitest";
import { aproveitamento, mediaMensal } from "./metricas";

describe("mediaMensal", () => {
  it("é a média simples dos meses informados (recorrente + bônus)", () => {
    const media = mediaMensal([
      { mes: "2026-05", coinsRecorrente: 1000, coinsBonus: 0 },
      { mes: "2026-06", coinsRecorrente: 1300, coinsBonus: 300 },
      { mes: "2026-07", coinsRecorrente: 900, coinsBonus: 0 },
    ]);
    expect(media).toBe((1000 + 1600 + 900) / 3);
  });

  it("sem meses lançados, a média é 0", () => {
    expect(mediaMensal([])).toBe(0);
  });
});

describe("aproveitamento", () => {
  it("é a soma do recorrente sobre o teto acumulado (1.300 × meses lançados)", () => {
    const pct = aproveitamento([
      { mes: "2026-05", coinsRecorrente: 1300, coinsBonus: 0 },
      { mes: "2026-06", coinsRecorrente: 650, coinsBonus: 0 },
    ]);
    expect(pct).toBe(((1300 + 650) / (1300 * 2)) * 100);
  });

  it("sem meses lançados, o aproveitamento é 0 (não divide por zero)", () => {
    expect(aproveitamento([])).toBe(0);
  });

  it("mês sem lançamento não é o mesmo que mês com zero coins (§9) — cabe ao chamador excluir o mês sem lançamento da lista, o que muda o divisor", () => {
    const doisMesesLancadosUmZerado = aproveitamento([
      { mes: "2026-05", coinsRecorrente: 1300, coinsBonus: 0 },
      { mes: "2026-06", coinsRecorrente: 0, coinsBonus: 0 }, // lançado, mas zerado
    ]);
    const apenasUmMesLancado = aproveitamento([
      { mes: "2026-05", coinsRecorrente: 1300, coinsBonus: 0 },
      // junho não entra: não teve lançamento algum
    ]);
    expect(doisMesesLancadosUmZerado).toBe((1300 / (1300 * 2)) * 100); // 50%
    expect(apenasUmMesLancado).toBe((1300 / (1300 * 1)) * 100); // 100%
    expect(doisMesesLancadosUmZerado).not.toBe(apenasUmMesLancado);
  });
});
