import { lerDossie, lerFrequencias } from "./dossie";
import { iniciais, normalizarNome } from "./texto";

// Reuniões com clientes (fase 3), lidas da lista 🗣️ Reuniões do ClickUp.
// Cada tarefa é uma reunião: o prazo é o dia e a hora; o status diz se
// aconteceu; o campo "Clientes" diz de quem é (ver ./clickup.ts). Aqui só
// regra pura: ler a tarefa, dar a situação e resumir o mês de um cliente.

export type SituacaoReuniao = "realizada" | "agendada" | "vencida" | "cancelada";

export interface Reuniao {
  id: string;
  nome: string;
  url: string;
  /** dia e hora da reunião (prazo da tarefa), ISO; null quando a tarefa não tem prazo */
  data: string | null;
  situacao: SituacaoReuniao;
  /** opção do campo "Clientes": é ela que liga a reunião ao cliente */
  opcaoCliente: string | null;
  responsaveis: string[];
  /** a tarefa tem a etiqueta "adiado" */
  adiada: boolean;
}

/** A tarefa como a API do ClickUp devolve (só o que o Hub usa). */
export interface TarefaClickUp {
  id: string;
  name: string;
  url: string;
  status: { status: string; type?: string };
  due_date?: string | number | null;
  assignees?: { username?: string | null }[];
  tags?: { name: string }[];
  custom_fields?: CampoDaTarefa[];
}

interface CampoDaTarefa {
  id: string;
  name?: string;
  type?: string;
  value?: unknown;
  type_config?: { options?: { id: string; orderindex?: number | string }[] };
}

const FUSO = "America/Maceio";
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function partes(d: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
}

/** "2026-11" do dia, no fuso de Maceió. */
export function mesDe(d: Date): string {
  const p = partes(d);
  return `${p.year}-${p.month}`;
}

/** "2026-11-25" do dia, no fuso de Maceió. */
export function diaDe(d: Date): string {
  const p = partes(d);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Mês vizinho: mesVizinho("2026-01", -1) = "2025-12". */
export function mesVizinho(mes: string, passo: number): string {
  const [a, m] = mes.split("-").map(Number);
  const total = a * 12 + (m - 1) + passo;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * Status da tarefa → situação da reunião. Concluída = realizada; cancelada
 * = cancelada; aberta com o dia já passado = vencida (aconteceu e ninguém
 * marcou, ou não aconteceu e ninguém remarcou); aberta = agendada.
 */
export function situacaoDaReuniao(status: { status: string; type?: string }, data: Date | null, agora: Date): SituacaoReuniao {
  const s = normalizarNome(status.status);
  if (s.startsWith("cancel")) return "cancelada";
  if (status.type === "closed" || status.type === "done" || ["complete", "concluida", "realizada"].includes(s)) {
    return "realizada";
  }
  if (data && diaDe(data) < diaDe(agora)) return "vencida";
  return "agendada";
}

/**
 * A opção do campo "Clientes" marcada na tarefa. O ClickUp guarda o ID da
 * opção (campos novos) ou a posição dela na lista (campos antigos).
 * Sem o ID do campo, procura um campo suspenso chamado "Clientes".
 */
export function opcaoDaTarefa(t: TarefaClickUp, campoId: string | null): string | null {
  const campo = t.custom_fields?.find((c) =>
    campoId ? c.id === campoId : c.type === "drop_down" && normalizarNome(c.name ?? "") === "clientes"
  );
  const v = campo?.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "string" && RE_UUID.test(v)) return v.toLowerCase();
  if (typeof v === "object" && v && "id" in v && typeof (v as { id: unknown }).id === "string") {
    return (v as { id: string }).id.toLowerCase();
  }
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  return campo?.type_config?.options?.find((o) => Number(o.orderindex) === n)?.id.toLowerCase() ?? null;
}

/** Só o que o Hub usa da tarefa: é isso que fica em cache (a ata da reunião, não). */
export interface TarefaEnxuta {
  id: string;
  nome: string;
  url: string;
  status: { status: string; type?: string };
  /** prazo em milissegundos; null = sem prazo */
  prazo: number | null;
  responsaveis: string[];
  adiada: boolean;
  opcao: string | null;
}

export function enxugarTarefa(t: TarefaClickUp, campoId: string | null): TarefaEnxuta {
  const ms = t.due_date === null || t.due_date === undefined || t.due_date === "" ? NaN : Number(t.due_date);
  return {
    id: t.id,
    // nomes vêm com vírgula ou ponto sobrando ("Taipa Inc,")
    nome: t.name.trim().replace(/[\s,.;]+$/, ""),
    url: t.url,
    status: { status: t.status.status, type: t.status.type },
    prazo: Number.isFinite(ms) ? ms : null,
    responsaveis: (t.assignees ?? []).map((a) => a.username?.trim() ?? "").filter(Boolean),
    adiada: (t.tags ?? []).some((x) => normalizarNome(x.name) === "adiado"),
    opcao: opcaoDaTarefa(t, campoId),
  };
}

/** O que a leitura do ClickUp guarda em cache. */
export interface LeituraBruta {
  tarefas: TarefaEnxuta[];
  lidasEm: string;
}

/** A situação depende de "agora" (vencida vira no dia seguinte): calcula na hora de mostrar. */
export function reuniaoDaTarefa(t: TarefaEnxuta, agora: Date): Reuniao {
  const data = t.prazo === null ? null : new Date(t.prazo);
  return {
    id: t.id,
    nome: t.nome,
    url: t.url,
    data: data ? data.toISOString() : null,
    situacao: situacaoDaReuniao(t.status, data, agora),
    opcaoCliente: t.opcao,
    responsaveis: t.responsaveis,
    adiada: t.adiada,
  };
}

export function lerTarefaReuniao(t: TarefaClickUp, campoId: string | null, agora: Date): Reuniao {
  return reuniaoDaTarefa(enxugarTarefa(t, campoId), agora);
}

/**
 * Reuniões esperadas no mês pela frequência de reunião combinada no
 * dossiê (briefing do Hub §6). null = frequência não combinada.
 */
export function esperadasNoMes(frequencia: string | null | undefined): number | null {
  const f = normalizarNome(frequencia ?? "");
  if (!f) return null;
  if (f.startsWith("semanal")) return 4;
  if (f.startsWith("quinzenal")) return 2;
  if (f.startsWith("mensal")) return 1;
  if (f.startsWith("sob demanda") || f.startsWith("nao tem") || f.startsWith("nao ha")) return 0;
  return null;
}

/**
 * Liga cada reunião aos clientes da opção dela (um grupo no ClickUp pode
 * ser mais de um cliente no Hub). Reunião sem opção, ou com opção que
 * nenhum cliente usa, vai para `semCliente`.
 */
export function reunioesPorCliente(
  reunioes: Reuniao[],
  clientes: { id: string; clickupClienteOpcao: string | null }[]
): { porCliente: Map<string, Reuniao[]>; semCliente: Reuniao[] } {
  const clientesDaOpcao = new Map<string, string[]>();
  for (const c of clientes) {
    if (!c.clickupClienteOpcao) continue;
    const k = c.clickupClienteOpcao.toLowerCase();
    clientesDaOpcao.set(k, [...(clientesDaOpcao.get(k) ?? []), c.id]);
  }
  const porCliente = new Map<string, Reuniao[]>();
  const semCliente: Reuniao[] = [];
  for (const r of reunioes) {
    const ids = r.opcaoCliente ? clientesDaOpcao.get(r.opcaoCliente) : undefined;
    if (!ids?.length) {
      semCliente.push(r);
      continue;
    }
    for (const id of ids) porCliente.set(id, [...(porCliente.get(id) ?? []), r]);
  }
  return { porCliente, semCliente };
}

export type SituacaoDoMes = "em-dia" | "agendada" | "vencida" | "falta" | "sem-previsao";

export interface ResumoDoMes {
  esperadas: number | null;
  realizadas: number;
  agendadas: number;
  vencidas: number;
  canceladas: number;
  /** próxima reunião agendada, de hoje em diante (qualquer mês) */
  proxima: Reuniao | null;
  /** última reunião realizada até hoje (qualquer mês) */
  ultima: Reuniao | null;
  situacao: SituacaoDoMes;
}

const quando = (r: Reuniao) => (r.data ? Date.parse(r.data) : 0);

/**
 * O mês de um cliente: quantas reuniões aconteceram contra as esperadas.
 * - vencida: há reunião do mês que passou do dia sem ser concluída;
 * - em-dia: realizadas já cobrem as esperadas;
 * - agendada: o que falta já está marcado (só no mês corrente);
 * - falta: faltam reuniões e não há o suficiente marcado;
 * - sem-previsao: frequência não combinada (ou zero) e nada no mês.
 */
export function resumirMes(reunioes: Reuniao[], mes: string, esperadas: number | null, agora: Date): ResumoDoMes {
  const doMes = reunioes.filter((r) => r.data && mesDe(new Date(r.data)) === mes);
  const conta = (s: SituacaoReuniao) => doMes.filter((r) => r.situacao === s).length;
  const realizadas = conta("realizada");
  const agendadas = conta("agendada");
  const vencidas = conta("vencida");
  const canceladas = conta("cancelada");

  const proxima =
    reunioes.filter((r) => r.situacao === "agendada" && r.data).sort((a, b) => quando(a) - quando(b))[0] ?? null;
  const ultima =
    reunioes
      .filter((r) => r.situacao === "realizada" && r.data && Date.parse(r.data) <= agora.getTime())
      .sort((a, b) => quando(b) - quando(a))[0] ?? null;

  let situacao: SituacaoDoMes;
  if (vencidas > 0) situacao = "vencida";
  else if (!esperadas) situacao = realizadas > 0 ? "em-dia" : agendadas > 0 ? "agendada" : "sem-previsao";
  else if (realizadas >= esperadas) situacao = "em-dia";
  else if (realizadas + agendadas >= esperadas) situacao = "agendada";
  else situacao = "falta";

  return { esperadas, realizadas, agendadas, vencidas, canceladas, proxima, ultima, situacao };
}

const DIA = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" });
const HORA = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * "qua, 25/11" e "14h" / "15h30". Tarefa só com dia (sem hora) o ClickUp
 * guarda às 4h da manhã: aí não há hora para mostrar.
 */
export function rotuloDaData(iso: string): { dia: string; hora: string | null } {
  const d = new Date(iso);
  const dia = DIA.format(d).replace(".", "").replace(/,\s*/, ", ");
  const [h, m] = HORA.format(d).split(":");
  if (h === "04" && m === "00") return { dia, hora: null };
  return { dia, hora: m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}` };
}

/** "novembro de 2026". */
export function nomeDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, 15)));
}

// ---------------------------------------------------------------
// conta por grupo (assessor, squad) e agrupamento da tela da gestão
// ---------------------------------------------------------------

export interface ContaDoGrupo {
  /** clientes do grupo com pelo menos uma reunião feita no mês */
  comReuniao: number;
  clientes: number;
  /** reuniões feitas no mês, somando todos os clientes do grupo */
  reunioes: number;
}

/**
 * "4/9 clientes com reunião": quem teve ao menos uma reunião feita no mês.
 * As reuniões feitas contam uma vez cada, mesmo quando valem para mais de
 * um cliente (um grupo no ClickUp).
 */
export function contarClientesComReuniao(linhas: { realizadas: number; realizadasIds?: string[] }[]): ContaDoGrupo {
  const comIds = linhas.every((l) => l.realizadasIds);
  return {
    comReuniao: linhas.filter((l) => l.realizadas > 0).length,
    clientes: linhas.length,
    reunioes: comIds
      ? new Set(linhas.flatMap((l) => l.realizadasIds ?? [])).size
      : linhas.reduce((s, l) => s + l.realizadas, 0),
  };
}

/**
 * IDs das reuniões feitas no mês, por cliente. A reunião de um grupo do
 * ClickUp aparece em cada cliente do grupo (e conta uma vez no total, ver
 * contarClientesComReuniao). Quem não aparece no mapa não teve reunião.
 */
export function feitasNoMes(
  reunioes: Reuniao[],
  clientes: { id: string; clickupClienteOpcao: string | null }[],
  mes: string
): Map<string, string[]> {
  const doMes = reunioes.filter((r) => r.situacao === "realizada" && r.data && mesDe(new Date(r.data)) === mes);
  const { porCliente } = reunioesPorCliente(doMes, clientes);
  return new Map([...porCliente].map(([id, rs]) => [id, rs.map((r) => r.id)]));
}

export interface LinhaAgrupavel {
  nome: string;
  assessorId: string | null;
  assessor: string | null;
  coordenacaoId: string | null;
  coordenacao: string | null;
  /** squad escrito no cadastro do cliente ("Norte") */
  squad: string | null;
}

export interface GrupoAssessor<T> {
  chave: string;
  nome: string;
  linhas: T[];
}

export interface GrupoSquad<T> {
  chave: string;
  /** "Squad Norte": o nome que o time usa (o squad mais comum dos clientes) ou o da coordenadora */
  rotulo: string;
  coordenacao: string | null;
  assessores: GrupoAssessor<T>[];
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}

/** O squad mais escrito entre os clientes do grupo; sem nenhum, o primeiro nome da coordenadora. */
function rotuloDoSquad(linhas: LinhaAgrupavel[], coordenacao: string | null): string {
  const conta = new Map<string, number>();
  for (const l of linhas) {
    const sq = l.squad?.trim();
    if (sq) conta.set(sq, (conta.get(sq) ?? 0) + 1);
  }
  const [maisComum] = [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  if (maisComum) return `Squad ${maisComum[0]}`;
  return coordenacao ? `Squad ${primeiroNome(coordenacao)}` : "Sem coordenação";
}

/**
 * Squad (a coordenação de cada cliente) → assessor → clientes. Em ordem de
 * nome; "sem coordenação" e "sem assessor" vão para o fim.
 */
export function agruparPorSquad<T extends LinhaAgrupavel>(linhas: T[]): GrupoSquad<T>[] {
  const porSquad = new Map<string, T[]>();
  for (const l of linhas) {
    const k = l.coordenacaoId ?? "";
    porSquad.set(k, [...(porSquad.get(k) ?? []), l]);
  }
  const ultimoSeVazio = (a: string, b: string, na: string, nb: string) =>
    Number(a === "") - Number(b === "") || na.localeCompare(nb, "pt-BR");

  return [...porSquad.entries()]
    .map(([chave, doSquad]) => {
      const coordenacao = doSquad.find((l) => l.coordenacao)?.coordenacao ?? null;
      const porAssessor = new Map<string, T[]>();
      for (const l of doSquad) {
        const k = l.assessorId ?? "";
        porAssessor.set(k, [...(porAssessor.get(k) ?? []), l]);
      }
      const assessores = [...porAssessor.entries()]
        .map(([k, ls]) => ({ chave: k || "sem-assessor", nome: ls.find((l) => l.assessor)?.assessor ?? "Sem assessor", linhas: ls, vazio: k }))
        .sort((a, b) => ultimoSeVazio(a.vazio, b.vazio, a.nome, b.nome))
        .map(({ chave: c, nome, linhas: ls }) => ({ chave: c, nome, linhas: ls }));
      return { chave: chave || "sem-coordenacao", rotulo: chave ? rotuloDoSquad(doSquad, coordenacao) : "Sem coordenação", coordenacao, assessores, vazio: chave };
    })
    .sort((a, b) => ultimoSeVazio(a.vazio, b.vazio, a.rotulo, b.rotulo))
    .map(({ chave, rotulo, coordenacao, assessores }) => ({ chave, rotulo, coordenacao, assessores }));
}

// ---------------------------------------------------------------
// linhas das telas de reuniões (gestão, Assessoria do assessor, Início)
// ---------------------------------------------------------------

export interface ReuniaoCurta {
  data: string;
  url: string;
}

export interface LinhaReuniao {
  id: string;
  slug: string;
  nome: string;
  iniciais: string;
  assessorId: string | null;
  assessor: string | null;
  coordenacaoId: string | null;
  coordenacao: string | null;
  /** squad escrito no cadastro do cliente */
  squad: string | null;
  /** cliente ligado a uma opção do campo Clientes do ClickUp */
  ligado: boolean;
  /** frequência combinada no dossiê ("Mensal") */
  frequencia: string | null;
  esperadas: number | null;
  realizadas: number;
  /** IDs das reuniões feitas no mês (a de um grupo aparece em mais de um cliente) */
  realizadasIds: string[];
  agendadas: number;
  vencidas: number;
  proxima: ReuniaoCurta | null;
  ultima: ReuniaoCurta | null;
  situacao: SituacaoDoMes;
}

export interface ClienteDaConta {
  id: string;
  slug: string;
  nome: string;
  assessorId: string | null;
  coordenacaoId?: string | null;
  squad: string | null;
  clickupClienteOpcao: string | null;
}

/** Frequência de reunião combinada no dossiê ("Mensal"); null sem dossiê ou sem a resposta. */
export function frequenciaDoDossie(md: string | null | undefined): string | null {
  return md ? lerFrequencias(lerDossie(md)).reuniao : null;
}

/** Uma linha por cliente: o mês dele contra a frequência do dossiê, a próxima e a última reunião. */
export function montarLinhasDeReunioes(args: {
  clientes: ClienteDaConta[];
  porCliente: Map<string, Reuniao[]>;
  dossies: Map<string, string>;
  nomeDoAssessor: Map<string, string>;
  nomeDaPessoa: Map<string, string>;
  mes: string;
  agora: Date;
}): LinhaReuniao[] {
  const { clientes, porCliente, dossies, nomeDoAssessor, nomeDaPessoa, mes, agora } = args;
  return clientes.map((c) => {
    const frequencia = frequenciaDoDossie(dossies.get(c.id));
    const esperadas = esperadasNoMes(frequencia);
    const doCliente = porCliente.get(c.id) ?? [];
    const r = resumirMes(doCliente, mes, esperadas, agora);
    return {
      id: c.id,
      slug: c.slug,
      nome: c.nome,
      iniciais: iniciais(c.nome),
      assessorId: c.assessorId,
      assessor: c.assessorId ? (nomeDoAssessor.get(c.assessorId) ?? null) : null,
      coordenacaoId: c.coordenacaoId ?? null,
      coordenacao: c.coordenacaoId ? (nomeDaPessoa.get(c.coordenacaoId) ?? null) : null,
      squad: c.squad,
      ligado: !!c.clickupClienteOpcao,
      frequencia: esperadas === null ? null : frequencia,
      esperadas,
      realizadas: r.realizadas,
      realizadasIds: doCliente
        .filter((x) => x.situacao === "realizada" && x.data && mesDe(new Date(x.data)) === mes)
        .map((x) => x.id),
      agendadas: r.agendadas,
      vencidas: r.vencidas,
      proxima: r.proxima?.data ? { data: r.proxima.data, url: r.proxima.url } : null,
      ultima: r.ultima?.data ? { data: r.ultima.data, url: r.ultima.url } : null,
      situacao: r.situacao,
    };
  });
}

export interface ReuniaoVencida {
  reuniao: Reuniao;
  /** nomes dos clientes da tela que a reunião envolve (um grupo pode ser mais de um) */
  clientes: string[];
}

/** Reuniões do mês que ainda estão agendadas com o dia passado, uma vez cada, em ordem de data. */
export function vencidasDoMes(
  porCliente: Map<string, Reuniao[]>,
  clientes: { id: string; nome: string }[],
  mes: string
): ReuniaoVencida[] {
  const nomeDe = new Map(clientes.map((c) => [c.id, c.nome]));
  const vencidas = new Map<string, ReuniaoVencida>();
  for (const [clienteId, lista] of porCliente) {
    const nome = nomeDe.get(clienteId);
    if (!nome) continue;
    for (const r of lista) {
      if (r.situacao !== "vencida" || !r.data || mesDe(new Date(r.data)) !== mes) continue;
      const atual = vencidas.get(r.id) ?? { reuniao: r, clientes: [] };
      atual.clientes.push(nome);
      vencidas.set(r.id, atual);
    }
  }
  return [...vencidas.values()].sort((a, b) => (a.reuniao.data ?? "").localeCompare(b.reuniao.data ?? ""));
}

/**
 * O mês pedido no endereço (?mes=2026-10), dentro da janela que o Hub lê do
 * ClickUp (6 meses para trás, 3 para frente). Fora dela, ou inválido, vale o
 * mês atual.
 */
export function mesDaTela(pedido: string | undefined, agora: Date) {
  const mesAtual = mesDe(agora);
  const primeiro = mesVizinho(mesAtual, -6);
  const ultimo = mesVizinho(mesAtual, 3);
  const mes =
    pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) && pedido >= primeiro && pedido <= ultimo ? pedido : mesAtual;
  return {
    mes,
    mesAtual,
    anterior: mes > primeiro ? mesVizinho(mes, -1) : null,
    seguinte: mes < ultimo ? mesVizinho(mes, 1) : null,
  };
}
