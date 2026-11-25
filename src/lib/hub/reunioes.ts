import { normalizarNome } from "./texto";

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
