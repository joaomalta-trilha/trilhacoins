import { describe, expect, it } from "vitest";
import { METAS, metaPorCodigo } from "./metas";
import { coinsDaMeta, totalBonus, totalMes, totalRecorrente } from "./pontuacao";

describe("coinsDaMeta — escala (3.1 nota de relacionamento)", () => {
  const meta = metaPorCodigo("3.1");

  it.each([
    ["Excelente", 300],
    ["Boa", 150],
    ["Insatisfatória", 0],
  ])("%s → %i coins", (rotulo, esperado) => {
    expect(coinsDaMeta(meta, rotulo)).toBe(esperado);
  });

  it("rótulo desconhecido não gera coins", () => {
    expect(coinsDaMeta(meta, "Regular")).toBe(0);
  });
});

describe("coinsDaMeta — percentual (3.4 entregas no prazo)", () => {
  const meta = metaPorCodigo("3.4");

  it.each([
    [95, 200],
    [90, 200], // limite inclusive
    [89, 100],
    [80, 100], // limite inclusive
    [75, 50],
    [70, 50], // limite inclusive
    [69, 0],
    [0, 0],
  ])("%i%% → %i coins", (pct, esperado) => {
    expect(coinsDaMeta(meta, pct)).toBe(esperado);
  });
});

describe("coinsDaMeta — percentual (3.5 reuniões com clientes)", () => {
  const meta = metaPorCodigo("3.5");

  it.each([
    [90, 200],
    [89, 100],
    [70, 100],
    [69, 50],
    [50, 50],
    [49, 0],
  ])("%i%% → %i coins", (pct, esperado) => {
    expect(coinsDaMeta(meta, pct)).toBe(esperado);
  });
});

describe("coinsDaMeta — contagem (3.8 indicações)", () => {
  const meta = metaPorCodigo("3.8");

  it("coins = quantidade × 300", () => {
    expect(coinsDaMeta(meta, 2)).toBe(600);
  });

  it("zero indicações não gera coins", () => {
    expect(coinsDaMeta(meta, 0)).toBe(0);
  });
});

describe("coinsDaMeta — livre (3.9 certificações)", () => {
  const meta = metaPorCodigo("3.9");

  it("o valor lançado já é a quantidade de coins", () => {
    expect(coinsDaMeta(meta, 450)).toBe(450);
  });
});

describe("coinsDaMeta — valor vazio", () => {
  it.each([undefined, null, ""])("valor %p sempre gera 0 coins", (valor) => {
    expect(coinsDaMeta(metaPorCodigo("3.1"), valor)).toBe(0);
  });
});

describe("totais do mês", () => {
  const lancamentos = {
    "3.1": "Excelente", // 300
    "3.2": "0 churns", // 200
    "3.3": "Muito", // 200
    "3.4": 95, // 200
    "3.5": 95, // 200
    "3.6": "Excelente", // 200
    "3.7": "R$ 1.000 a 2.000", // 200 (bônus)
    "3.8": 1, // 300 (bônus)
    "3.9": 100, // 100 (bônus)
  };

  it("totalRecorrente soma só 3.1–3.6, respeitando o teto de 1.300", () => {
    expect(totalRecorrente(METAS, lancamentos)).toBe(300 + 200 + 200 + 200 + 200 + 200);
  });

  it("totalBonus soma só 3.7–3.9, sem teto", () => {
    expect(totalBonus(METAS, lancamentos)).toBe(200 + 300 + 100);
  });

  it("totalMes é a soma de recorrente + bônus", () => {
    expect(totalMes(METAS, lancamentos)).toBe(
      totalRecorrente(METAS, lancamentos) + totalBonus(METAS, lancamentos)
    );
  });

  it("lançamento ausente (undefined/null) não quebra e conta como 0", () => {
    expect(totalRecorrente(METAS, undefined)).toBe(0);
    expect(totalRecorrente(METAS, null)).toBe(0);
    expect(totalBonus(METAS, undefined)).toBe(0);
  });

  it("é data-driven: uma tabela de metas diferente muda o resultado sem tocar no motor de cálculo", () => {
    const metasCustomizadas = METAS.map((m) =>
      m.codigo === "3.1" ? { ...m, teto: 500, faixas: [{ rotulo: "Excelente", coins: 500, ordem: 1 }] } : m
    );
    expect(totalRecorrente(metasCustomizadas, { "3.1": "Excelente" })).toBe(500);
  });
});
