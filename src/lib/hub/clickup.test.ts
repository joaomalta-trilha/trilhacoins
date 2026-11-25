import { describe, expect, it } from "vitest";
import { type OpcaoClickUp, nomeDaOpcao, sugerirOpcao } from "./clickup";

// Opções fictícias, no formato do campo "Clientes" do ClickUp.
const OPCOES: OpcaoClickUp[] = [
  { id: "a", nome: "Exemplo Imóveis " },
  { id: "b", nome: "Hotel Exemplo" },
  { id: "c", nome: "Clínica São Teste" },
  { id: "d", nome: "Grupo Norte Empreendimentos" },
  { id: "e", nome: "Grupo Norte Vacation" },
  { id: "f", nome: "Loja Modelo" },
];

describe("sugerirOpcao", () => {
  it("nome igual, sem contar acento, caixa, espaço e pontuação", () => {
    expect(sugerirOpcao("Exemplo Imóveis", OPCOES)).toEqual({ opcao: OPCOES[0], como: "nome-igual" });
    expect(sugerirOpcao("clinica sao teste.", OPCOES)?.opcao.id).toBe("c");
  });

  it("nome contido: o cliente do Hub é uma parte do que o ClickUp trata como um cliente só", () => {
    expect(sugerirOpcao("Hotel Exemplo Centro", OPCOES)).toEqual({ opcao: OPCOES[1], como: "nome-contido" });
    expect(sugerirOpcao("Hotel Exemplo Praia", OPCOES)?.opcao.id).toBe("b");
    expect(sugerirOpcao("Grupo Norte Vacation Club / Resort", OPCOES)?.opcao.id).toBe("e");
  });

  it("na dúvida não chuta: duas candidatas, erro de digitação ou nada parecido", () => {
    expect(sugerirOpcao("Grupo Norte", OPCOES)).toBeNull(); // cabe em duas opções
    expect(sugerirOpcao("Exemplo Imoveiss", OPCOES)).toBeNull(); // digitação
    expect(sugerirOpcao("Cliente Novo", OPCOES)).toBeNull();
    expect(sugerirOpcao("", OPCOES)).toBeNull();
  });

  it("duas opções com o mesmo nome também ficam para a gestão decidir", () => {
    expect(sugerirOpcao("Loja Modelo", [...OPCOES, { id: "g", nome: "Loja  Modelo" }])).toBeNull();
  });

  it("mostra o nome da opção sem os espaços que sobram", () => {
    expect(nomeDaOpcao(OPCOES[0])).toBe("Exemplo Imóveis");
  });
});
