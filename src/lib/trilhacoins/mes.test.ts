import { describe, expect, it } from "vitest";
import {
  ehCheckpoint,
  mesAtualChave,
  mesesEntre,
  primeiroCheckpointEmOuApos,
  somarMeses,
} from "./mes";

describe("mesAtualChave", () => {
  it("usa a data real informada, não uma seleção de filtro", () => {
    expect(mesAtualChave(new Date(2026, 8, 4))).toBe("2026-09"); // setembro = mês índice 8
  });
});

describe("somarMeses", () => {
  it("soma meses dentro do mesmo ano", () => {
    expect(somarMeses("2026-01", 2)).toBe("2026-03");
  });

  it("vira o ano ao somar além de dezembro", () => {
    expect(somarMeses("2026-11", 3)).toBe("2027-02");
  });

  it("subtrai meses (n negativo)", () => {
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
  });
});

describe("mesesEntre", () => {
  it("conta meses inteiros entre duas chaves", () => {
    expect(mesesEntre("2026-01", "2026-04")).toBe(3);
  });

  it("cruza o limite do ano", () => {
    expect(mesesEntre("2026-11", "2027-02")).toBe(3);
  });

  it("é zero para o mesmo mês", () => {
    expect(mesesEntre("2026-06", "2026-06")).toBe(0);
  });

  it("é negativa quando `ate` é anterior a `de`", () => {
    expect(mesesEntre("2026-06", "2026-03")).toBe(-3);
  });
});

describe("ehCheckpoint", () => {
  it.each([
    ["2026-03", true],
    ["2026-06", true],
    ["2026-09", true],
    ["2026-12", true],
    ["2026-01", false],
    ["2026-07", false],
  ])("%s → %s", (chave, esperado) => {
    expect(ehCheckpoint(chave)).toBe(esperado);
  });
});

describe("primeiroCheckpointEmOuApos", () => {
  it("retorna o próprio mês quando ele já é checkpoint", () => {
    expect(primeiroCheckpointEmOuApos("2026-06")).toBe("2026-06");
  });

  it("avança até o próximo checkpoint dentro do mesmo ano", () => {
    expect(primeiroCheckpointEmOuApos("2026-04")).toBe("2026-06");
    expect(primeiroCheckpointEmOuApos("2026-01")).toBe("2026-03");
  });

  it("vira para março do ano seguinte depois de dezembro", () => {
    expect(primeiroCheckpointEmOuApos("2026-12")).toBe("2026-12");
    expect(primeiroCheckpointEmOuApos("2027-01")).toBe("2027-03");
  });
});
