import { describe, expect, it } from "vitest";
import { paraFazerDoAssessor } from "./inicio";
import type { LinhaReuniao, Reuniao } from "./reunioes";

// Clientes e reuniões fictícios.
function linha(nome: string, situacao: LinhaReuniao["situacao"], ligado = true): LinhaReuniao {
  return {
    id: nome,
    slug: nome.toLowerCase(),
    nome,
    iniciais: "XX",
    assessorId: "a1",
    assessor: "Fulano",
    coordenacaoId: null,
    coordenacao: null,
    squad: null,
    ligado,
    frequencia: "Mensal",
    esperadas: 1,
    realizadas: 0,
    realizadasIds: [],
    agendadas: 0,
    vencidas: 0,
    proxima: null,
    ultima: null,
    situacao,
  };
}

const vencida: Reuniao = {
  id: "r1",
  nome: "Exemplo",
  url: "https://app.clickup.com/t/r1",
  data: "2026-11-20T17:00:00.000Z",
  situacao: "vencida",
  opcaoCliente: null,
  responsaveis: [],
  adiada: false,
};

describe("para fazer do assessor", () => {
  it("vencida primeiro, depois quem está sem reunião marcada, depois a rotina de hoje", () => {
    const itens = paraFazerDoAssessor({
      vencidas: [{ reuniao: vencida, clientes: ["Exemplo"] }],
      linhas: [linha("Alfa", "falta"), linha("Beta", "falta"), linha("Gama", "em-dia"), linha("Delta", "falta", false)],
      ritosHoje: { ritos: 4, clientes: 3 },
      diaUtil: "Quarta",
      nomeDoMes: "novembro",
    });
    expect(itens.map((i) => i.tom)).toEqual(["acento", "atencao", "neutro"]);
    expect(itens[0]).toMatchObject({ titulo: "Reunião vencida · Exemplo", href: vencida.url, externo: true });
    expect(itens[0].detalhe).toContain("sex, 20/11 às 14h");
    // quem não está ligado ao ClickUp não entra na conta de "sem reunião"
    expect(itens[1]).toMatchObject({ titulo: "2 clientes sem reunião marcada em novembro", href: "/assessoria#reunioes" });
    expect(itens[1].detalhe).toMatch(/^Alfa e Beta\./);
    expect(itens[2]).toMatchObject({ titulo: "4 ritos na rotina de hoje", href: "/assessoria#rotina" });
  });

  it("lista longa de nomes resume o resto; fim de semana não tem rotina", () => {
    const itens = paraFazerDoAssessor({
      vencidas: [],
      linhas: ["A", "B", "C", "D", "E"].map((n) => linha(n, "falta")),
      ritosHoje: { ritos: 0, clientes: 0 },
      diaUtil: null,
      nomeDoMes: "novembro",
    });
    expect(itens).toHaveLength(1);
    expect(itens[0].detalhe).toMatch(/^A, B, C e mais 2\./);
  });

  it("tudo em dia: nada para fazer", () => {
    expect(
      paraFazerDoAssessor({
        vencidas: [],
        linhas: [linha("A", "em-dia")],
        ritosHoje: { ritos: 0, clientes: 0 },
        diaUtil: "Quarta",
        nomeDoMes: "novembro",
      })
    ).toEqual([]);
  });
});
