import { describe, expect, it } from "vitest";
import { filtroDaTabela, passaNoFiltro, resumoDoDossie } from "./central-clientes";

const dossie = (respondidas: number, faltam: string[]) => ({ existe: respondidas > 0, respondidas, total: 17, faltam });

describe("planilha de clientes", () => {
  it("filtro desconhecido no endereço volta para Todos", () => {
    expect(filtroDaTabela("sem-nota")).toBe("sem-nota");
    expect(filtroDaTabela("lixo")).toBe("todos");
    expect(filtroDaTabela(undefined)).toBe("todos");
  });

  it("cada filtro separa o que promete", () => {
    const linha = { dossie: dossie(16, ["Acesso ao CRM"]), pts: null, status: "pausado" as const };
    expect(passaNoFiltro("incompletos", linha)).toBe(true);
    expect(passaNoFiltro("sem-nota", linha)).toBe(true);
    expect(passaNoFiltro("pausados", linha)).toBe(true);
    expect(passaNoFiltro("inativos", linha)).toBe(false);
    expect(passaNoFiltro("incompletos", { ...linha, dossie: dossie(17, []) })).toBe(false);
    expect(passaNoFiltro("sem-nota", { ...linha, pts: 12 })).toBe(false);
  });

  it("a coluna Dossiê diz o que falta, sem lista longa", () => {
    expect(resumoDoDossie(dossie(17, []))).toBe("17 de 17 respondidas");
    expect(resumoDoDossie(dossie(0, Array(17).fill("x")))).toBe("Nada respondido ainda");
    expect(resumoDoDossie(dossie(15, ["Conta no Meta", "Acesso ao CRM"]))).toBe("Falta Conta no Meta e Acesso ao CRM");
    expect(resumoDoDossie(dossie(12, ["a", "b", "c", "d", "e"]))).toBe("Faltam 5 de 17");
  });
});
