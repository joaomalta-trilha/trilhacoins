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
  assessor: string | null;
  coordenacao: string[];
  dossie: { existe: boolean; respondidas: number; total: number; faltam: string[] };
  pts: number | null;
  criterios: NotasCriterios | null;
}

export const FILTROS_TABELA = ["todos", "incompletos", "sem-nota", "pausados", "inativos"] as const;
export type FiltroTabela = (typeof FILTROS_TABELA)[number];

export function filtroDaTabela(valor: string | undefined): FiltroTabela {
  return FILTROS_TABELA.includes(valor as FiltroTabela) ? (valor as FiltroTabela) : "todos";
}

export function passaNoFiltro(f: FiltroTabela, l: Pick<LinhaCliente, "dossie" | "pts" | "status">): boolean {
  switch (f) {
    case "incompletos":
      return l.dossie.faltam.length > 0;
    case "sem-nota":
      return l.pts === null;
    case "pausados":
      return l.status === "pausado";
    case "inativos":
      return l.status === "saiu";
    default:
      return true;
  }
}

/** "Falta Meta e Canais", "Faltam 5 de 17", "Nada respondido ainda". */
export function resumoDoDossie(d: LinhaCliente["dossie"]): string {
  if (d.faltam.length === 0) return `${d.total} de ${d.total} respondidas`;
  if (d.respondidas === 0) return "Nada respondido ainda";
  if (d.faltam.length <= 2) return `Falta ${d.faltam.join(" e ")}`;
  return `Faltam ${d.faltam.length} de ${d.total}`;
}
