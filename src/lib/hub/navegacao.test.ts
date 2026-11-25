import { describe, expect, it } from "vitest";
import { itemAtivo, itensDeNavegacao, modoEfetivo, paginaInicial, podeTrocarModo, rotuloPapel } from "./navegacao";
import { normalizarNome, primeiroNome, semAcento, slugificar } from "./texto";

describe("modo de experiência", () => {
  it("assessor nunca sai da experiência de assessor", () => {
    expect(modoEfetivo("assessor", "gestao")).toBe("assessor");
    expect(podeTrocarModo("assessor")).toBe(false);
  });

  it("coordenação e diretoria entram na gestão, salvo se pediram para ver como assessor", () => {
    expect(modoEfetivo("coordenacao", undefined)).toBe("gestao");
    expect(modoEfetivo("diretoria", "lixo")).toBe("gestao");
    expect(modoEfetivo("diretoria", "assessor")).toBe("assessor");
    expect(podeTrocarModo("coordenacao")).toBe(true);
  });

  it("página inicial por modo", () => {
    expect(paginaInicial("assessor")).toBe("/inicio");
    expect(paginaInicial("gestao")).toBe("/gestao");
  });
});

describe("itens do menu", () => {
  const hrefs = (papel: Parameters<typeof itensDeNavegacao>[0], modo: Parameters<typeof itensDeNavegacao>[1]) =>
    itensDeNavegacao(papel, modo)
      .filter((i) => !i.emBreve)
      .map((i) => i.href);

  it("assessor vê o próprio dia, a carteira, a Trilha e o Coins", () => {
    expect(hrefs("assessor", "assessor")).toEqual(["/inicio", "/clientes", "/trilha", "/coins"]);
  });

  it("gestão tem a planilha de Clientes e as carteiras em Assessoria", () => {
    expect(hrefs("coordenacao", "gestao")).toEqual(["/gestao", "/clientes", "/assessoria", "/trilha", "/coins"]);
  });

  it("só a diretoria vê Usuários", () => {
    expect(hrefs("diretoria", "gestao")).toContain("/gestao/usuarios");
    expect(hrefs("coordenacao", "gestao")).not.toContain("/gestao/usuarios");
  });

  it("módulos futuros aparecem como 'em breve' com a fase", () => {
    const futuros = itensDeNavegacao("assessor", "assessor").filter((i) => i.emBreve);
    expect(futuros.map((i) => i.rotulo)).toEqual(["Tarefas", "Reuniões"]);
    expect(futuros.every((i) => i.emBreve === "fase 3")).toBe(true);
  });

  it("acende o item de href mais longo que casa com a rota", () => {
    const itens = itensDeNavegacao("diretoria", "gestao");
    expect(itemAtivo("/gestao", itens)).toBe("/gestao");
    expect(itemAtivo("/gestao/usuarios", itens)).toBe("/gestao/usuarios");
    expect(itemAtivo("/coins/equipe", itens)).toBe("/coins");
    expect(itemAtivo("/clientes/exemplo", itens)).toBe("/clientes");
    expect(itemAtivo("/assessoria", itens)).toBe("/assessoria");
    expect(itemAtivo("/saude", itens)).toBeNull(); // em breve: não é link
    expect(itemAtivo("/clientesx", itens)).toBeNull();
  });

  it("cargo é só rótulo; sem cargo, mostra o papel", () => {
    expect(rotuloPapel("diretoria", "Gerente de Performance")).toBe("Gerente de Performance");
    expect(rotuloPapel("coordenacao", "  ")).toBe("Coordenação");
    expect(rotuloPapel("assessor")).toBe("Assessor");
  });
});

describe("texto", () => {
  it("normaliza nomes vindos de fontes diferentes", () => {
    expect(semAcento("São José")).toBe("Sao Jose");
    expect(normalizarNome("  Pousada Exemplo ")).toBe("pousada exemplo");
    expect(normalizarNome("ACME / Residencial Sol")).toBe("acme residencial sol");
    expect(slugificar("Construtora São José")).toBe("construtora-sao-jose");
    expect(slugificar("Pão & Café")).toBe("pao-cafe");
    expect(primeiroNome("Fulana de Tal")).toBe("Fulana");
  });
});
