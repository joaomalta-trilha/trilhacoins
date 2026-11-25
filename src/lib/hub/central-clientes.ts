import type { NotasCriterios } from "./exigencia";

// Regras da planilha de Clientes (gestão): o que cada filtro mostra e como
// a coluna Dossiê resume o que falta. A tela só consome.

export type StatusLinha = "ativo" | "pausado" | "saiu";

export interface LinhaCliente {
  id: string;
  slug: string;
  nome: string;
  iniciais: string;
  pacote: string | null;
  pedeAtencao: boolean;
  status: StatusLinha;
  assessorId: string | null;
  /** nome do assessor, para mostrar e buscar mesmo fora das opções da pessoa logada */
  assessor: string | null;
  coordenacaoId: string | null;
  /** nomes de quem coordena (um, quando a coordenação é do cliente) */
  coordenacao: string[];
  dossie: { existe: boolean; respondidas: number; total: number; faltam: string[] };
  pts: number | null;
  criterios: NotasCriterios | null;
}

/** Situação mostrada na planilha. A aba abre em Ativos. */
export const STATUS_TABELA = ["ativos", "pausados", "inativos", "todos"] as const;
export type StatusTabela = (typeof STATUS_TABELA)[number];

/** Pendências que se somam à situação ("ativos com dossiê incompleto"). */
export const PENDENCIAS = ["incompletos", "sem-nota"] as const;
export type Pendencia = (typeof PENDENCIAS)[number];

export function statusDaTabela(valor: string | undefined): StatusTabela {
  return STATUS_TABELA.includes(valor as StatusTabela) ? (valor as StatusTabela) : "ativos";
}

export function pendenciaDaTabela(valor: string | undefined): Pendencia | null {
  return PENDENCIAS.includes(valor as Pendencia) ? (valor as Pendencia) : null;
}

export function passaNoStatus(s: StatusTabela, l: Pick<LinhaCliente, "status">): boolean {
  if (s === "ativos") return l.status === "ativo";
  if (s === "pausados") return l.status === "pausado";
  if (s === "inativos") return l.status === "saiu";
  return true;
}

export function temPendencia(p: Pendencia, l: Pick<LinhaCliente, "dossie" | "pts">): boolean {
  return p === "incompletos" ? l.dossie.faltam.length > 0 : l.pts === null;
}

/** Endereço da planilha com a situação e a pendência escolhidas (Ativos é o padrão e não aparece). */
export function enderecoDaTabela(caminho: string, s: StatusTabela, p: Pendencia | null): string {
  const q = new URLSearchParams();
  if (s !== "ativos") q.set("status", s);
  if (p) q.set("pendencia", p);
  const t = q.toString();
  return t ? `${caminho}?${t}` : caminho;
}

/** "Falta Meta e Canais", "Faltam 5 de 17", "Nada respondido ainda". */
export function resumoDoDossie(d: LinhaCliente["dossie"]): string {
  if (d.faltam.length === 0) return `${d.total} de ${d.total} respondidas`;
  if (d.respondidas === 0) return "Nada respondido ainda";
  if (d.faltam.length <= 2) return `Falta ${d.faltam.join(" e ")}`;
  return `Faltam ${d.faltam.length} de ${d.total}`;
}
