import type { DiaUtil } from "./dossie";
import { type LinhaReuniao, type ReuniaoVencida, rotuloDaData } from "./reunioes";

// "Para fazer" do Início do assessor: o que pede ação agora, tirado das
// reuniões do mês e da rotina de hoje. A ordem é a da urgência: reunião
// vencida, cliente sem reunião marcada, rotina do dia.

export interface ItemParaFazer {
  chave: string;
  tom: "acento" | "atencao" | "neutro";
  titulo: string;
  detalhe: string;
  href: string;
  /** abre fora do Hub (a tarefa no ClickUp) */
  externo: boolean;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function listaDeNomes(nomes: string[], max = 3): string {
  const vistos = nomes.slice(0, max);
  const resto = nomes.length - vistos.length;
  if (resto > 0) return `${vistos.join(", ")} e mais ${resto}`;
  if (vistos.length <= 1) return vistos.join("");
  return `${vistos.slice(0, -1).join(", ")} e ${vistos[vistos.length - 1]}`;
}

export function paraFazerDoAssessor(args: {
  vencidas: ReuniaoVencida[];
  linhas: LinhaReuniao[];
  ritosHoje: { ritos: number; clientes: number };
  diaUtil: DiaUtil | null;
  /** "novembro" */
  nomeDoMes: string;
}): ItemParaFazer[] {
  const { vencidas, linhas, ritosHoje, diaUtil, nomeDoMes } = args;
  const itens: ItemParaFazer[] = [];

  for (const { reuniao: r, clientes } of vencidas.slice(0, 3)) {
    const { dia, hora } = rotuloDaData(r.data!);
    itens.push({
      chave: `vencida-${r.id}`,
      tom: "acento",
      titulo: `Reunião vencida · ${clientes.join(", ")}`,
      detalhe: `Era ${dia}${hora ? ` às ${hora}` : ""}. Se aconteceu, marque como concluída no ClickUp; se não, remarque.`,
      href: r.url,
      externo: true,
    });
  }

  const semReuniao = linhas.filter((l) => l.ligado && l.situacao === "falta").map((l) => l.nome);
  if (semReuniao.length) {
    itens.push({
      chave: "falta-reuniao",
      tom: "atencao",
      titulo: `${plural(semReuniao.length, "cliente", "clientes")} sem reunião marcada em ${nomeDoMes}`,
      detalhe: `${listaDeNomes(semReuniao)}. Combine a data com o cliente e registre na lista de reuniões do ClickUp.`,
      href: "/assessoria#reunioes",
      externo: false,
    });
  }

  if (diaUtil && ritosHoje.ritos > 0) {
    itens.push({
      chave: "rotina-hoje",
      tom: "neutro",
      titulo: `${plural(ritosHoje.ritos, "rito", "ritos")} na rotina de hoje`,
      detalhe: `Em ${plural(ritosHoje.clientes, "cliente", "clientes")}. O passo a passo de cada um está na Assessoria.`,
      href: "/assessoria#rotina",
      externo: false,
    });
  }

  return itens;
}
