import { DIAS_UTEIS, type DiaUtil, lerDossie, lerRotina, resumoDoItem } from "./dossie";
import { iniciais } from "./texto";

// A rotina da semana da carteira (Assessoria do assessor e Início): os
// ritos de cada cliente, lidos do dossiê, um dia útil por vez.

export interface ClienteRotina {
  slug: string;
  nome: string;
  iniciais: string;
  pedeAtencao: boolean;
  /** itens já resumidos (uma linha cada), por dia útil */
  dias: Record<DiaUtil, string[]>;
}

const FUSO = "America/Maceio";

/** Saudação, dia útil de hoje e o rótulo do dia ("Quarta-feira, 25 de novembro"), em Maceió. */
export function agoraEmMaceio(agora: Date = new Date()) {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO }).format(agora);
  const data = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO }).format(agora);
  const nome = diaSemana.split("-")[0].toLowerCase();
  const indice = ["segunda", "terça", "quarta", "quinta", "sexta"].indexOf(nome);
  const rotulo = `${diaSemana}, ${data}`;
  return {
    saudacao: hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite",
    diaUtil: (indice >= 0 ? DIAS_UTEIS[indice] : null) as DiaUtil | null,
    rotuloDia: rotulo.charAt(0).toUpperCase() + rotulo.slice(1),
  };
}

/** Clientes da carteira com algum rito na semana, já resumidos por dia. */
export function montarRotina(
  clientes: { id: string; slug: string; nome: string; pedeAtencao: boolean }[],
  dossies: Map<string, string>
): ClienteRotina[] {
  return clientes.flatMap((c) => {
    const md = dossies.get(c.id);
    const r = md ? lerRotina(lerDossie(md)) : null;
    if (!r) return [];
    const dias = Object.fromEntries(DIAS_UTEIS.map((d) => [d, r.dias[d].map(resumoDoItem)])) as Record<DiaUtil, string[]>;
    if (!DIAS_UTEIS.some((d) => dias[d].length)) return [];
    return [{ slug: c.slug, nome: c.nome, iniciais: iniciais(c.nome), pedeAtencao: c.pedeAtencao, dias }];
  });
}

/** Quantos ritos hoje e em quantos clientes. */
export function ritosDoDia(rotina: ClienteRotina[], dia: DiaUtil | null): { ritos: number; clientes: number } {
  if (!dia) return { ritos: 0, clientes: 0 };
  const doDia = rotina.filter((c) => c.dias[dia].length);
  return { ritos: doDia.reduce((s, c) => s + c.dias[dia].length, 0), clientes: doDia.length };
}
