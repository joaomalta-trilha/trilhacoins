import "server-only";

import { unstable_cache } from "next/cache";
import { type LeituraBruta, type Reuniao, type TarefaClickUp, type TarefaEnxuta, enxugarTarefa, reuniaoDaTarefa } from "@/lib/hub/reunioes";

// Leitura do ClickUp (fase 3). Só o servidor fala com o ClickUp, com a
// chave guardada na Vercel (CLICKUP_TOKEN); nenhuma tela chama a API
// direto. O que fica em cache por 10 minutos, igual para todos (a API
// limita as chamadas por minuto), é a tarefa enxuta: sem a ata da
// reunião, que é grande e não aparece no Hub. "Atualizar agora" derruba
// o cache pela etiqueta. Quem vê o quê continua decidido pelo banco: as
// telas só mostram reuniões dos clientes que a pessoa já pode ver.

export const TAG_REUNIOES = "clickup-reunioes";
const API = "https://api.clickup.com/api/v2";

export type LeituraReunioes =
  | { ok: true; reunioes: Reuniao[]; lidasEm: string | null }
  | { ok: false; motivo: "sem-configuracao" | "chave-recusada" | "falha"; detalhe?: string };

class ErroClickUp extends Error {
  constructor(
    readonly motivo: "chave-recusada" | "falha",
    detalhe?: string
  ) {
    super(detalhe ?? motivo);
  }
}

/**
 * Janela de busca em meses inteiros (6 para trás, 3 para frente). Fica
 * igual o mês todo, então a chave do cache não muda a cada minuto.
 */
function janela(agora: Date): { desde: number; ate: number } {
  const a = agora.getUTCFullYear();
  const m = agora.getUTCMonth();
  return { desde: Date.UTC(a, m - 6, 1), ate: Date.UTC(a, m + 4, 1) };
}

// Erro não entra no cache (sai como exceção): uma falha passageira não fica presa por 10 minutos.
const lerDoClickUp = unstable_cache(
  async (lista: string, campoClientes: string | null, desde: number, ate: number): Promise<LeituraBruta> => {
    const token = process.env.CLICKUP_TOKEN?.trim();
    if (!token) throw new ErroClickUp("falha", "sem chave");
    const tarefas: TarefaEnxuta[] = [];
    for (let pagina = 0; pagina < 30; pagina++) {
      const q = new URLSearchParams({
        include_closed: "true",
        subtasks: "true",
        order_by: "due_date",
        due_date_gt: String(desde),
        due_date_lt: String(ate),
        page: String(pagina),
      });
      const res = await fetch(`${API}/list/${encodeURIComponent(lista)}/task?${q}`, {
        headers: { Authorization: token },
        cache: "no-store",
      });
      if (res.status === 401 || res.status === 403) throw new ErroClickUp("chave-recusada");
      if (!res.ok) throw new ErroClickUp("falha", `o ClickUp respondeu ${res.status}`);
      const corpo = (await res.json()) as { tasks?: TarefaClickUp[]; last_page?: boolean };
      const lote = corpo.tasks ?? [];
      tarefas.push(...lote.map((t) => enxugarTarefa(t, campoClientes)));
      if (corpo.last_page === true || lote.length < 100) break;
    }
    return { tarefas, lidasEm: new Date().toISOString() };
  },
  ["clickup-reunioes-v1"],
  { revalidate: 600, tags: [TAG_REUNIOES] }
);

/** Reuniões da lista 🗣️ Reuniões dentro da janela, com a situação calculada agora. */
export async function buscarReunioes(agora: Date = new Date()): Promise<LeituraReunioes> {
  const lista = process.env.CLICKUP_LISTA_REUNIOES?.trim();
  if (!process.env.CLICKUP_TOKEN?.trim() || !lista) return { ok: false, motivo: "sem-configuracao" };
  const { desde, ate } = janela(agora);
  try {
    const bruta = await lerDoClickUp(lista, process.env.CLICKUP_CAMPO_CLIENTES?.trim() || null, desde, ate);
    return { ok: true, reunioes: bruta.tarefas.map((t) => reuniaoDaTarefa(t, agora)), lidasEm: bruta.lidasEm };
  } catch (e) {
    if (e instanceof ErroClickUp) return { ok: false, motivo: e.motivo, detalhe: e.message };
    return { ok: false, motivo: "falha", detalhe: e instanceof Error ? e.message : String(e) };
  }
}
