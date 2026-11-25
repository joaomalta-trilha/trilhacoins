import { describe, expect, it } from "vitest";
import {
  CRITERIOS_EXIGENCIA,
  estrelasDaExigencia,
  faixaDaExigencia,
  lerNotasCriterios,
  macroNivel,
  pontosDosCriterios,
  resumirCarteira,
  tetoDoNivel,
  validarNotasCriterios,
} from "./exigencia";

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

describe("notas por critério", () => {
  // um cliente da planilha de controle de carteira: 3+3+3+3+2+3+5 = 22 pontos
  const pesado = { volume: 3, complexidade: 3, relacionamento: 3, canais: 3, urgencia: 2, reunioes: 3, importancia: 5 };

  it("a soma das sete notas é a pontuação, e a pontuação vira a faixa", () => {
    expect(pontosDosCriterios(pesado)).toBe(22);
    expect(faixaDaExigencia(22)).toMatchObject({ estrelas: 5, exigencia: "Máxima" });
    expect(pontosDosCriterios({ ...pesado, volume: 1, complexidade: 1, relacionamento: 1, canais: 1, urgencia: 1, reunioes: 1, importancia: 1 })).toBe(7);
  });

  it("enquanto faltar critério, não há pontuação", () => {
    expect(pontosDosCriterios({ ...pesado, importancia: undefined })).toBeNull();
    expect(pontosDosCriterios(null)).toBeNull();
  });

  it("o que vem do banco só aproveita chave conhecida com nota válida", () => {
    expect(lerNotasCriterios({ volume: 2, canais: 9, outra: 1, urgencia: "3" })).toEqual({ volume: 2 });
    expect(lerNotasCriterios({ canais: 0 })).toBeNull();
    expect(lerNotasCriterios([1, 2])).toBeNull();
    expect(lerNotasCriterios(null)).toBeNull();
  });

  it("o pop-up só grava as sete notas, cada uma de 1 ao peso do critério", () => {
    expect(validarNotasCriterios({ ...pesado, extra: 4 })).toEqual(pesado);
    expect(() => validarNotasCriterios({ ...pesado, importancia: 6 })).toThrow("vai de 1 a 5");
    expect(() => validarNotasCriterios({ ...pesado, canais: 4 })).toThrow("vai de 1 a 3");
    expect(() => validarNotasCriterios({ ...pesado, volume: 2.5 })).toThrow("vai de 1 a 4");
    expect(() => validarNotasCriterios({ ...pesado, reunioes: undefined })).toThrow("Falta a nota de reuniões e relacionamento");
    expect(() => validarNotasCriterios("22")).toThrow("Notas inválidas");
  });
});
