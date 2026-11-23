import { describe, expect, it } from "vitest";
import { CRITERIOS_EXIGENCIA, estrelasDaExigencia, macroNivel, resumirCarteira, tetoDoNivel } from "./exigencia";

describe("estrelasDaExigencia", () => {
  it.each([
    [7, 1],
    [10, 1],
    [11, 2],
    [13, 2],
    [14, 3],
    [17, 3],
    [18, 4],
    [21, 4],
    [22, 5],
    [25, 5],
  ])("%i pontos → %i estrelas", (pts, estrelas) => {
    expect(estrelasDaExigencia(pts)).toBe(estrelas);
  });

  it.each([null, undefined, 6, 26, Number.NaN])("fora da faixa (%s) → null", (pts) => {
    expect(estrelasDaExigencia(pts as number | null | undefined)).toBeNull();
  });

  it("os sete critérios somam de 7 a 25 pontos", () => {
    expect(CRITERIOS_EXIGENCIA).toHaveLength(7);
    expect(CRITERIOS_EXIGENCIA.reduce((s, c) => s + c.pesoMaximo, 0)).toBe(25);
  });
});

describe("macroNivel e teto", () => {
  it.each([
    ["Júnior I", "junior"],
    ["Junior 2", "junior"],
    ["Pleno III", "pleno"],
    ["Sênior II", "senior"],
    ["Partner", "partner"],
    ["Estagiário", null],
    [null, null],
  ])("%s → %s", (nivel, macro) => {
    expect(macroNivel(nivel)).toBe(macro);
  });

  it("tetos por macro-nível", () => {
    expect(tetoDoNivel("Júnior III")).toEqual({ pts: 85, max4: 1, max5: 0 });
    expect(tetoDoNivel("Pleno I")).toEqual({ pts: 120, max4: 2, max5: 1 });
    expect(tetoDoNivel("Sênior I")).toEqual({ pts: 160, max4: 3, max5: 2 });
    expect(tetoDoNivel("Partner")).toBeNull();
  });
});

describe("resumirCarteira", () => {
  it("soma pontos, conta 4 e 5 estrelas e ignora quem não tem nota", () => {
    const r = resumirCarteira([12, 18, 22, null, 8], "Pleno II");
    expect(r).toMatchObject({ clientes: 5, semNota: 1, pts: 60, n4: 1, n5: 1, pct: 50, situacao: "equilibrada" });
    expect(r.excede4).toBe(false);
    expect(r.excede5).toBe(false);
  });

  it("marca carteira quase completa a partir de 85% e completa a partir de 100%", () => {
    expect(resumirCarteira([25, 25, 25], "Júnior I").situacao).toBe("quase-completa"); // 75/85 = 88%
    expect(resumirCarteira([25, 25, 25, 10], "Júnior I").situacao).toBe("completa"); // 85/85
  });

  it("acusa excesso de clientes 4 e 5 estrelas para o nível", () => {
    const r = resumirCarteira([18, 19, 22], "Júnior II");
    expect(r.excede4).toBe(true);
    expect(r.excede5).toBe(true);
  });

  it("sem nível conhecido, não há teto", () => {
    const r = resumirCarteira([10, 12], null);
    expect(r).toMatchObject({ pts: 22, teto: null, pct: null, situacao: "sem-nivel" });
  });
});
