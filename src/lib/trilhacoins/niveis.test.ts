import { describe, expect, it } from "vitest";
import { NIVEIS, nivelPorCodigo, proximoNivel, requisitoMacroDoNivel } from "./niveis";

describe("tabela de custos de promoção (§5.1)", () => {
  it.each([
    ["Júnior I", 2700],
    ["Júnior II", 4000],
    ["Júnior III", 6800],
    ["Pleno I", 8100],
    ["Pleno II", 8100],
    ["Pleno III", 8100],
    ["Sênior I", 12200],
    ["Sênior II", 12200],
    ["Sênior III", 16200],
    ["Partner", null],
  ])("%s → custo %s", (codigo, custo) => {
    expect(nivelPorCodigo(codigo).custoPromocao).toBe(custo);
  });

  it("tem exatamente os 10 níveis da trilha, em ordem", () => {
    expect(NIVEIS.map((n) => n.codigo)).toEqual([
      "Júnior I",
      "Júnior II",
      "Júnior III",
      "Pleno I",
      "Pleno II",
      "Pleno III",
      "Sênior I",
      "Sênior II",
      "Sênior III",
      "Partner",
    ]);
  });
});

describe("proximoNivel", () => {
  it("retorna o nível seguinte na ordem", () => {
    expect(proximoNivel("Júnior I")?.codigo).toBe("Júnior II");
  });

  it("Partner não tem próximo nível", () => {
    expect(proximoNivel("Partner")).toBeNull();
  });
});

describe("requisitoMacroDoNivel (§5.4)", () => {
  it.each([
    ["Júnior III", "Avaliação de autonomia nas contas"],
    ["Pleno III", "Gestão autônoma de pelo menos uma conta complexa"],
    ["Sênior III", "Validação da diretoria, com histórico de receita e retenção"],
  ])("%s exige requisito qualitativo", (codigo, esperado) => {
    expect(requisitoMacroDoNivel(codigo)).toBe(esperado);
  });

  it("níveis sem pré-requisito qualitativo retornam null", () => {
    expect(requisitoMacroDoNivel("Júnior I")).toBeNull();
    expect(requisitoMacroDoNivel("Pleno I")).toBeNull();
  });
});
