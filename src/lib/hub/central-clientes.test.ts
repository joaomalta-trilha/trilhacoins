import { describe, expect, it } from "vitest";
import {
  enderecoDaTabela,
  passaNoStatus,
  pendenciaDaTabela,
  resumoDoDossie,
  statusDaTabela,
  temPendencia,
} from "./central-clientes";

const dossie = (respondidas: number, faltam: string[]) => ({ existe: respondidas > 0, respondidas, total: 17, faltam });

describe("planilha de clientes", () => {
  it("abre em Ativos; valor desconhecido no endereço também cai em Ativos", () => {
    expect(statusDaTabela(undefined)).toBe("ativos");
    expect(statusDaTabela("lixo")).toBe("ativos");
    expect(statusDaTabela("todos")).toBe("todos");
    expect(pendenciaDaTabela("sem-nota")).toBe("sem-nota");
    expect(pendenciaDaTabela("lixo")).toBeNull();
  });

  it("cada situação mostra só o seu status", () => {
    expect(passaNoStatus("ativos", { status: "ativo" })).toBe(true);
    expect(passaNoStatus("ativos", { status: "pausado" })).toBe(false);
    expect(passaNoStatus("pausados", { status: "pausado" })).toBe(true);
    expect(passaNoStatus("inativos", { status: "saiu" })).toBe(true);
    expect(passaNoStatus("todos", { status: "saiu" })).toBe(true);
  });

  it("as pendências olham o dossiê e a nota de carteira", () => {
    const linha = { dossie: dossie(16, ["Acesso ao CRM"]), pts: null, pedeAtencao: false };
    expect(temPendencia("incompletos", linha)).toBe(true);
    expect(temPendencia("sem-nota", linha)).toBe(true);
    expect(temPendencia("incompletos", { ...linha, dossie: dossie(17, []) })).toBe(false);
    expect(temPendencia("sem-nota", { ...linha, pts: 12 })).toBe(false);
  });

  it("o recorte Pede atenção mostra só quem a gestão marcou", () => {
    const linha = { dossie: dossie(17, []), pts: 12, pedeAtencao: false };
    expect(temPendencia("atencao", linha)).toBe(false);
    expect(temPendencia("atencao", { ...linha, pedeAtencao: true })).toBe(true);
    expect(pendenciaDaTabela("atencao")).toBe("atencao");
    expect(enderecoDaTabela("/clientes", "ativos", "atencao")).toBe("/clientes?pendencia=atencao");
  });

  it("o endereço guarda o filtro, sem repetir o padrão", () => {
    expect(enderecoDaTabela("/clientes", "ativos", null)).toBe("/clientes");
    expect(enderecoDaTabela("/clientes", "todos", null)).toBe("/clientes?status=todos");
    expect(enderecoDaTabela("/clientes", "ativos", "sem-nota")).toBe("/clientes?pendencia=sem-nota");
  });

  it("a coluna Dossiê diz o que falta, sem lista longa", () => {
    expect(resumoDoDossie(dossie(17, []))).toBe("17 de 17 respondidas");
    expect(resumoDoDossie(dossie(0, Array(17).fill("x")))).toBe("Nada respondido ainda");
    expect(resumoDoDossie(dossie(15, ["Conta no Meta", "Acesso ao CRM"]))).toBe("Falta Conta no Meta e Acesso ao CRM");
    expect(resumoDoDossie(dossie(12, ["a", "b", "c", "d", "e"]))).toBe("Faltam 5 de 17");
  });
});
