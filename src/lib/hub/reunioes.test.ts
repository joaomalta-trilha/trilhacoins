import { describe, expect, it } from "vitest";
import {
  agruparPorSquad,
  contarClientesComReuniao,
  type Reuniao,
  type TarefaClickUp,
  diaDe,
  esperadasNoMes,
  lerTarefaReuniao,
  mesDe,
  mesVizinho,
  nomeDoMes,
  opcaoDaTarefa,
  resumirMes,
  reunioesPorCliente,
  rotuloDaData,
  situacaoDaReuniao,
} from "./reunioes";

// IDs e nomes fictícios.
const CAMPO = "11111111-1111-4111-8111-111111111111";
const OPCAO_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OPCAO_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
// 25/11/2026 às 10h em Maceió (13h UTC)
const AGORA = new Date("2026-11-25T13:00:00Z");

function tarefa(parcial: Partial<TarefaClickUp> = {}): TarefaClickUp {
  return {
    id: "t1",
    name: "Exemplo Imóveis",
    url: "https://app.clickup.com/t/t1",
    status: { status: "agendada", type: "open" },
    due_date: String(Date.parse("2026-11-28T15:00:00Z")),
    assignees: [{ username: "Fulano" }],
    tags: [],
    custom_fields: [{ id: CAMPO, name: "Clientes", type: "drop_down", value: OPCAO_A }],
    ...parcial,
  };
}

function reuniao(dia: string, situacao: Reuniao["situacao"], opcao = OPCAO_A): Reuniao {
  return {
    id: `${dia}-${situacao}`,
    nome: "Exemplo",
    url: "https://app.clickup.com/t/x",
    data: `${dia}T15:00:00.000Z`,
    situacao,
    opcaoCliente: opcao,
    responsaveis: [],
    adiada: false,
  };
}

describe("datas no fuso de Maceió", () => {
  it("o dia e o mês seguem Maceió, não o UTC", () => {
    // 1º de dezembro às 01h UTC ainda é 30 de novembro em Maceió
    const virada = new Date("2026-12-01T01:00:00Z");
    expect(diaDe(virada)).toBe("2026-11-30");
    expect(mesDe(virada)).toBe("2026-11");
  });

  it("anda de mês em mês, atravessando o ano", () => {
    expect(mesVizinho("2026-01", -1)).toBe("2025-12");
    expect(mesVizinho("2026-12", 1)).toBe("2027-01");
    expect(mesVizinho("2026-11", 0)).toBe("2026-11");
  });
});

describe("situação de cada reunião", () => {
  it("concluída é realizada; cancelada é cancelada", () => {
    expect(situacaoDaReuniao({ status: "complete", type: "closed" }, null, AGORA)).toBe("realizada");
    expect(situacaoDaReuniao({ status: "cancelada", type: "done" }, null, AGORA)).toBe("cancelada");
  });

  it("aberta com o dia passado vence; hoje e depois continuam agendadas", () => {
    const aberta = { status: "agendada", type: "open" };
    expect(situacaoDaReuniao(aberta, new Date("2026-11-24T15:00:00Z"), AGORA)).toBe("vencida");
    expect(situacaoDaReuniao(aberta, new Date("2026-11-25T11:00:00Z"), AGORA)).toBe("agendada"); // hoje, mais cedo
    expect(situacaoDaReuniao(aberta, new Date("2026-12-02T15:00:00Z"), AGORA)).toBe("agendada");
    expect(situacaoDaReuniao(aberta, null, AGORA)).toBe("agendada");
  });
});

describe("leitura da tarefa do ClickUp", () => {
  it("a opção do campo Clientes vem pelo ID, pela posição (campo antigo) ou sem o ID do campo", () => {
    expect(opcaoDaTarefa(tarefa(), CAMPO)).toBe(OPCAO_A);
    const antigo = tarefa({
      custom_fields: [
        { id: CAMPO, name: "Clientes", type: "drop_down", value: 1, type_config: { options: [{ id: OPCAO_A, orderindex: 0 }, { id: OPCAO_B, orderindex: 1 }] } },
      ],
    });
    expect(opcaoDaTarefa(antigo, CAMPO)).toBe(OPCAO_B);
    expect(opcaoDaTarefa(tarefa(), null)).toBe(OPCAO_A); // acha o campo pelo nome
    expect(opcaoDaTarefa(tarefa({ custom_fields: [{ id: CAMPO, type: "drop_down" }] }), CAMPO)).toBeNull();
  });

  it("limpa o nome, lê o prazo como a data e marca a etiqueta de adiada", () => {
    const r = lerTarefaReuniao(tarefa({ name: " Exemplo Inc, ", tags: [{ name: "adiado" }] }), CAMPO, AGORA);
    expect(r.nome).toBe("Exemplo Inc");
    expect(r.data).toBe("2026-11-28T15:00:00.000Z");
    expect(r.situacao).toBe("agendada");
    expect(r.adiada).toBe(true);
    expect(r.responsaveis).toEqual(["Fulano"]);
    expect(lerTarefaReuniao(tarefa({ due_date: null }), CAMPO, AGORA).data).toBeNull();
  });
});

describe("reuniões esperadas pela frequência do dossiê", () => {
  it.each([
    ["Semanal", 4],
    ["Quinzenal", 2],
    ["Mensal", 1],
    ["Sob demanda", 0],
    ["Não tem", 0],
    ["", null],
    [null, null],
    ["Quando der", null],
  ])("%s → %s", (freq, n) => {
    expect(esperadasNoMes(freq as string | null)).toBe(n);
  });
});

describe("reuniões de cada cliente", () => {
  it("uma opção do ClickUp pode ser mais de um cliente no Hub; sem opção conhecida, fica sem cliente", () => {
    const rs = [reuniao("2026-11-10", "realizada", OPCAO_A), reuniao("2026-11-12", "realizada", OPCAO_B)];
    const { porCliente, semCliente } = reunioesPorCliente(rs, [
      { id: "c1", clickupClienteOpcao: OPCAO_A },
      { id: "c2", clickupClienteOpcao: OPCAO_A },
      { id: "c3", clickupClienteOpcao: null },
    ]);
    expect(porCliente.get("c1")).toHaveLength(1);
    expect(porCliente.get("c2")).toHaveLength(1);
    expect(porCliente.has("c3")).toBe(false);
    expect(semCliente.map((r) => r.opcaoCliente)).toEqual([OPCAO_B]);
  });
});

describe("resumo do mês", () => {
  it("em dia quando as realizadas cobrem as esperadas", () => {
    const r = resumirMes([reuniao("2026-11-05", "realizada"), reuniao("2026-11-19", "realizada")], "2026-11", 2, AGORA);
    expect(r).toMatchObject({ realizadas: 2, situacao: "em-dia" });
    expect(r.ultima?.data).toBe("2026-11-19T15:00:00.000Z");
  });

  it("o que falta já está marcado: agendada; não está: falta", () => {
    const base = [reuniao("2026-11-05", "realizada")];
    expect(resumirMes([...base, reuniao("2026-11-28", "agendada")], "2026-11", 2, AGORA).situacao).toBe("agendada");
    expect(resumirMes(base, "2026-11", 2, AGORA).situacao).toBe("falta");
  });

  it("reunião vencida pede atenção antes de tudo", () => {
    const r = resumirMes([reuniao("2026-11-05", "realizada"), reuniao("2026-11-20", "vencida")], "2026-11", 1, AGORA);
    expect(r).toMatchObject({ vencidas: 1, situacao: "vencida" });
  });

  it("sem frequência combinada: mostra o que houve, sem cobrar", () => {
    expect(resumirMes([], "2026-11", null, AGORA).situacao).toBe("sem-previsao");
    expect(resumirMes([], "2026-11", 0, AGORA).situacao).toBe("sem-previsao");
    expect(resumirMes([reuniao("2026-11-05", "realizada")], "2026-11", null, AGORA).situacao).toBe("em-dia");
  });

  it("a próxima é a agendada mais perto, mesmo em outro mês; cancelada não conta", () => {
    const r = resumirMes(
      [reuniao("2026-12-10", "agendada"), reuniao("2026-12-03", "agendada"), reuniao("2026-11-20", "cancelada")],
      "2026-11",
      1,
      AGORA
    );
    expect(r.proxima?.data).toBe("2026-12-03T15:00:00.000Z");
    expect(r).toMatchObject({ realizadas: 0, canceladas: 1, situacao: "falta" });
  });
});

describe("datas para mostrar", () => {
  it("dia com a semana; hora só quando a tarefa tem hora", () => {
    expect(rotuloDaData("2026-11-26T17:00:00.000Z")).toEqual({ dia: "qui, 26/11", hora: "14h" });
    expect(rotuloDaData("2026-10-29T18:30:00.000Z")).toEqual({ dia: "qui, 29/10", hora: "15h30" });
    // só o dia: o ClickUp guarda às 4h de Maceió (7h UTC)
    expect(rotuloDaData("2026-11-25T07:00:00.000Z")).toEqual({ dia: "qua, 25/11", hora: null });
  });

  it("nome do mês por extenso", () => {
    expect(nomeDoMes("2026-11")).toBe("novembro de 2026");
    expect(nomeDoMes("2027-01")).toBe("janeiro de 2027");
  });
});

describe("conta e grupos da tela da gestão", () => {
  // squads, pessoas e clientes fictícios
  const linha = (nome: string, assessorId: string | null, coordenacaoId: string | null, squad: string | null, realizadas = 0) => ({
    nome,
    assessorId,
    assessor: assessorId ? `Assessor ${assessorId}` : null,
    coordenacaoId,
    coordenacao: coordenacaoId ? `Coordenadora ${coordenacaoId} Silva` : null,
    squad,
    realizadas,
  });

  it("4/9 clientes com reunião: conta quem teve ao menos uma, e soma as reuniões", () => {
    const ls = [linha("A", "x", "c1", null, 3), linha("B", "x", "c1", null, 0), linha("C", "x", "c1", null, 2)];
    expect(contarClientesComReuniao(ls)).toEqual({ comReuniao: 2, clientes: 3, reunioes: 5 });
    expect(contarClientesComReuniao([])).toEqual({ comReuniao: 0, clientes: 0, reunioes: 0 });
  });

  it("reunião de um grupo vale para cada cliente, mas conta uma vez no total", () => {
    const grupo = [
      { realizadas: 2, realizadasIds: ["r1", "r2"] },
      { realizadas: 2, realizadasIds: ["r1", "r2"] },
      { realizadas: 1, realizadasIds: ["r3"] },
    ];
    expect(contarClientesComReuniao(grupo)).toEqual({ comReuniao: 3, clientes: 3, reunioes: 3 });
  });

  it("separa por squad (a coordenação do cliente) e, dentro, por assessor", () => {
    const grupos = agruparPorSquad([
      linha("Cliente 1", "b", "c2", "Sul"),
      linha("Cliente 2", "a", "c1", "Norte"),
      linha("Cliente 3", "a", "c1", "Norte"),
      linha("Cliente 4", "c", "c1", "Norte"),
      linha("Cliente 5", null, "c1", null),
      linha("Cliente 6", "d", null, null),
    ]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Squad Norte", "Squad Sul", "Sem coordenação"]);
    expect(grupos[0].coordenacao).toBe("Coordenadora c1 Silva");
    expect(grupos[0].assessores.map((a) => [a.nome, a.linhas.length])).toEqual([
      ["Assessor a", 2],
      ["Assessor c", 1],
      ["Sem assessor", 1],
    ]);
  });

  it("o nome do squad é o mais escrito nos clientes; sem nenhum, o primeiro nome da coordenadora", () => {
    const misto = agruparPorSquad([linha("1", "a", "c1", "Norte"), linha("2", "a", "c1", "Norte"), linha("3", "a", "c1", "Leste")]);
    expect(misto[0].rotulo).toBe("Squad Norte");
    expect(agruparPorSquad([linha("1", "a", "c9", null)])[0].rotulo).toBe("Squad Coordenadora");
  });
});
