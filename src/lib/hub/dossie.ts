import { capitalizar } from "./texto";

// Leitura do dossiê do cliente. O dossiê é um Markdown com formato
// combinado (o mesmo da Trilha do Assessor):
//
//   # Nome do cliente
//   - Em uma frase: ...          ← cabeçalho: "- Chave: valor"
//   - Objetivo: ...
//   ## Rotina da semana          ← seções
//   **Segunda**
//   - item do dia
//   ## SWOT
//   ### Forças
//
// Guardar o texto inteiro (e não campo a campo) preserva o que a
// coordenação e o assistente escreveram; as telas extraem daqui o que
// precisam mostrar em destaque.

export interface SecaoDossie {
  titulo: string;
  linhas: string[];
}

export interface Dossie {
  titulo: string;
  cabecalho: [string, string][];
  intro: string[];
  secoes: SecaoDossie[];
}

const RE_CABECALHO = /^- ([^:]{2,70}): (.*)$/;

export function lerDossie(md: string): Dossie {
  const out: Dossie = { titulo: "", cabecalho: [], intro: [], secoes: [] };
  let atual: SecaoDossie | null = null;
  for (const linha of md.replace(/\r\n?/g, "\n").split("\n")) {
    if (!out.titulo && !atual && linha.startsWith("# ")) {
      out.titulo = linha.slice(2).trim();
      continue;
    }
    if (linha.startsWith("## ")) {
      atual = { titulo: linha.slice(3).trim(), linhas: [] };
      out.secoes.push(atual);
      continue;
    }
    if (!atual) {
      const m = linha.match(RE_CABECALHO);
      if (m) out.cabecalho.push([m[1].trim(), m[2].trim()]);
      else if (linha.trim()) out.intro.push(linha);
      continue;
    }
    atual.linhas.push(linha);
  }
  for (const s of out.secoes) {
    while (s.linhas.length && !s.linhas[s.linhas.length - 1].trim()) s.linhas.pop();
    while (s.linhas.length && !s.linhas[0].trim()) s.linhas.shift();
  }
  return out;
}

/** Valor do cabeçalho cuja chave começa com `prefixo` ("Verba mensal no Meta"). */
export function campo(d: Dossie, prefixo: string): string {
  return d.cabecalho.find(([k]) => k.startsWith(prefixo))?.[1] ?? "";
}

export function secao(d: Dossie, prefixo: string): SecaoDossie | undefined {
  return d.secoes.find((s) => s.titulo.startsWith(prefixo));
}

export function textoDaSecao(s: SecaoDossie | undefined): string {
  return s ? s.linhas.join("\n").trim() : "";
}

// ---------------------------------------------------------------
// rotina da semana
// ---------------------------------------------------------------

export const DIAS_UTEIS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"] as const;
export type DiaUtil = (typeof DIAS_UTEIS)[number];

const DIA_POR_ABREV: Record<string, DiaUtil> = {
  Seg: "Segunda",
  Ter: "Terça",
  Qua: "Quarta",
  Qui: "Quinta",
  Sex: "Sexta",
};

export interface RotinaSemana {
  intro: string[];
  dias: Record<DiaUtil, string[]>;
  /** blocos fora dos dias ("Otimização (terça e quinta)", "Alertas…") */
  extras: SecaoDossie[];
  /** linhas soltas da rotina do assistente ("Relatório: Semanal · …") */
  observacoes: string[];
}

function diasVazios(): Record<DiaUtil, string[]> {
  return { Segunda: [], Terça: [], Quarta: [], Quinta: [], Sexta: [] };
}

/**
 * Prefere "Rotina da semana" (calendário escrito dia a dia); sem ela,
 * monta os dias a partir de "Rotina do assistente" ("Mensagens da
 * semana que valem: Seg: …; Ter: …").
 */
export function lerRotina(d: Dossie): RotinaSemana | null {
  const s = secao(d, "Rotina da semana") ?? secao(d, "Rotina do assistente");
  if (!s) return null;
  const r: RotinaSemana = { intro: [], dias: diasVazios(), extras: [], observacoes: [] };

  if (s.titulo.startsWith("Rotina da semana")) {
    let dia: DiaUtil | null = null;
    let extra: SecaoDossie | null = null;
    for (const l of s.linhas) {
      const negrito = l.match(/^\*\*(.+?)\*\*\s*$/);
      if (negrito) {
        const nome = negrito[1].trim();
        if ((DIAS_UTEIS as readonly string[]).includes(nome)) {
          dia = nome as DiaUtil;
          extra = null;
        } else {
          dia = null;
          extra = { titulo: nome, linhas: [] };
          r.extras.push(extra);
        }
        continue;
      }
      if (dia) {
        const item = l.match(/^\s*-\s+(.*)$/);
        if (item) r.dias[dia].push(item[1].trim());
        continue;
      }
      if (extra) {
        extra.linhas.push(l);
        continue;
      }
      if (l.trim()) r.intro.push(l.trim());
    }
    return r;
  }

  for (const l of s.linhas) {
    const t = l.replace(/^-\s*/, "").trim();
    if (!t) continue;
    if (t.startsWith("Mensagens da semana que valem:")) {
      for (const parte of t.slice(t.indexOf(":") + 1).split(";")) {
        const m = parte.trim().match(/^(Seg|Ter|Qua|Qui|Sex):\s*(.+)$/);
        if (m) r.dias[DIA_POR_ABREV[m[1]]].push(capitalizar(m[2].trim()));
      }
    } else if (t.startsWith("Conferir toda segunda:")) {
      r.dias.Segunda.push(`Conferir: ${t.slice(t.indexOf(":") + 1).trim()}`);
    } else {
      r.observacoes.push(t);
    }
  }
  return r;
}

export interface FrequenciasCombinadas {
  relatorio: string | null;
  reuniao: string | null;
}

/** "Relatório: Semanal · Reunião de resultados: Mensal" (rotina do assistente). */
export function lerFrequencias(d: Dossie): FrequenciasCombinadas {
  const texto = textoDaSecao(secao(d, "Rotina do assistente"));
  const relatorio = texto.match(/Relat[óo]rio:\s*([^·\n]+)/i)?.[1].trim() ?? null;
  const reuniao = texto.match(/Reuni[ãa]o de resultados:\s*([^·\n]+)/i)?.[1].trim() ?? null;
  return { relatorio, reuniao };
}

// ---------------------------------------------------------------
// SWOT
// ---------------------------------------------------------------

export interface Swot {
  forcas: string[];
  fraquezas: string[];
  oportunidades: string[];
  ameacas: string[];
  /** linhas em itálico do topo ("_Rascunho do assistente…_") */
  notas: string[];
  fontes: string[];
}

export function lerSwot(d: Dossie): Swot | null {
  const s = secao(d, "SWOT");
  if (!s) return null;
  const partes: Record<string, string[]> = {};
  const notas: string[] = [];
  const fontes: string[] = [];
  let atual: string | null = null;
  for (const l of s.linhas) {
    const t = l.trim();
    if (/^(-\s*)?Fontes do mercado/i.test(t)) {
      fontes.push(t.replace(/^-\s*/, ""));
      continue;
    }
    if (l.startsWith("### ")) {
      atual = l.slice(4).trim();
      partes[atual] = [];
      continue;
    }
    if (atual) {
      if (t) partes[atual].push(l);
    } else if (t.startsWith("_")) {
      notas.push(t);
    }
  }
  return {
    forcas: partes["Forças"] ?? [],
    fraquezas: partes["Fraquezas"] ?? [],
    oportunidades: partes["Oportunidades"] ?? [],
    ameacas: partes["Ameaças"] ?? [],
    notas,
    fontes,
  };
}

// ---------------------------------------------------------------
// contas, acessos e atalhos
// ---------------------------------------------------------------

export interface ContaMeta {
  id: string;
  nome: string | null;
}

/** IDs de contas do Meta citados no dossiê ("act_123…" ou "Conta Nome (123…)"). */
export function contasMeta(md: string): ContaMeta[] {
  const contas = new Map<string, string | null>();
  for (const m of md.matchAll(/(?:\*\*|###\s+)Conta ([^*(\n]*)\((\d{6,})\)/g)) {
    contas.set(m[2], m[1].trim() || null);
  }
  for (const m of md.matchAll(/act_(\d{6,})/g)) {
    if (!contas.has(m[1])) contas.set(m[1], null);
  }
  return [...contas].map(([id, nome]) => ({ id, nome }));
}

export function urlGerenciadorMeta(contaId: string): string {
  return `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(contaId)}`;
}

export interface LinkDeAcesso {
  rotulo: string;
  url: string;
  detalhe: string;
}

const RE_URL = /https?:\/\/[^\s)`>\]]+/;

/** Links da seção "Acessos e links". Só http(s) — nada de javascript: ou data:. */
export function linksDeAcesso(d: Dossie): LinkDeAcesso[] {
  const s = secao(d, "Acessos");
  if (!s) return [];
  const out: LinkDeAcesso[] = [];
  for (const l of s.linhas) {
    const url = l.match(RE_URL)?.[0];
    if (!url) continue;
    const semMarcador = l.replace(/^\s*-\s*/, "");
    const rotulo = semMarcador.split(/[:(]/)[0].trim() || "Link";
    const detalhe = l
      .slice(l.indexOf(url) + url.length)
      .replace(/[()]/g, "")
      .replace(/^[\s.,:;-]+/, "")
      .replace(/[.\s]+$/, "")
      .trim();
    out.push({ rotulo, url, detalhe });
  }
  return out;
}

/** Linhas de "Acessos e links" que não são link nem aviso de senha (ex.: "Kommo: o assistente já tem acesso"). */
export function notasDeAcesso(d: Dossie): string[] {
  const s = secao(d, "Acessos");
  if (!s) return [];
  return s.linhas
    .map((l) => l.replace(/^\s*-\s*/, "").trim())
    .filter((l) => l && !RE_URL.test(l) && !/^Senhas/i.test(l));
}

export interface Atalho {
  nome: string;
  descricao: string;
  url: string;
  sigla: string;
}

const SISTEMAS: { chave: string; nome: string; url: string; sigla: string }[] = [
  { chave: "kommo", nome: "Kommo", url: "https://www.kommo.com/br/", sigla: "K" },
  { chave: "heiven", nome: "Heiven", url: "https://app.heiven.com.br/", sigla: "H" },
  { chave: "rd station", nome: "RD Station", url: "https://app.rdstation.com.br/", sigla: "RD" },
  { chave: "make", nome: "Make", url: "https://www.make.com/", sigla: "Mk" },
  { chave: "botconversa", nome: "BotConversa", url: "https://app.botconversa.com.br/", sigla: "BC" },
  { chave: "meu negócio", nome: "Google Meu Negócio", url: "https://business.google.com/", sigla: "GN" },
];

/**
 * Atalhos de trabalho do cliente: contas no Gerenciador do Meta, Google
 * Ads (se anuncia), CRM e sistemas citados na rotina, e os links da
 * seção de acessos. Sem duplicar URL.
 */
export function atalhosDoDossie(d: Dossie, md: string): Atalho[] {
  const vistos = new Set<string>();
  const out: Atalho[] = [];
  const add = (a: Atalho) => {
    if (vistos.has(a.url)) return;
    vistos.add(a.url);
    out.push(a);
  };

  for (const c of contasMeta(md)) {
    add({ nome: "Gerenciador de anúncios", descricao: c.nome ?? `Conta ${c.id}`, url: urlGerenciadorMeta(c.id), sigla: "M" });
  }
  if (/google/i.test(campo(d, "Canais")) && !/não anuncia|ainda não/i.test(campo(d, "Verba mensal no Google"))) {
    add({ nome: "Google Ads", descricao: "Conta administradora da Trilha", url: "https://ads.google.com/", sigla: "G" });
  }
  const crm = campo(d, "CRM").toLowerCase();
  const rotina = textoDaSecao(secao(d, "Rotina do assistente")).toLowerCase();
  for (const s of SISTEMAS) {
    if (crm.includes(s.chave)) add({ nome: s.nome, descricao: "CRM do cliente", url: s.url, sigla: s.sigla });
    else if (rotina.includes(s.chave)) add({ nome: s.nome, descricao: "Conferir toda segunda", url: s.url, sigla: s.sigla });
  }
  for (const l of linksDeAcesso(d)) {
    const drive = /drive\.google\.com\/drive\/folders/.test(l.url);
    const planilha = /docs\.google\.com\/spreadsheets/.test(l.url);
    let host = "";
    try {
      host = new URL(l.url).host;
    } catch {
      continue;
    }
    add({
      nome: l.rotulo,
      descricao: l.detalhe || (drive ? "Google Drive" : planilha ? "Planilha Google" : host),
      url: l.url,
      sigla: drive ? "D" : planilha ? "PL" : l.rotulo.replace(/[^A-Za-zÀ-ú ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase() || "↗",
    });
  }
  return out;
}

/** Seções que descrevem a conta como ela está ("No ar hoje", "Melhores anúncios", …). */
export function secoesDaConta(d: Dossie): SecaoDossie[] {
  return d.secoes.filter((s) =>
    /^(No ar|Melhores anúncios|Pontos de atenção|Rotina que o assessor faz hoje)/.test(s.titulo)
  );
}

/** Resumo curto de um item da rotina, para caber no calendário. */
/**
 * Item de lista de tarefas do Markdown ("[ ] fazer", "[x] feito"): devolve
 * o texto sem a caixinha, para a tela desenhar a marca no lugar dela.
 */
export function separarTarefa(texto: string): { tarefa: boolean; feita: boolean; texto: string } {
  const m = texto.match(/^\s*\[( |x|X)\]\s+/);
  if (!m) return { tarefa: false, feita: false, texto };
  return { tarefa: true, feita: m[1].toLowerCase() === "x", texto: texto.slice(m[0].length) };
}

export function resumoDoItem(texto: string): string {
  const s = separarTarefa(texto)
    .texto.replace(/\*\*|`|_/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
  const doisPontos = s.indexOf(":");
  if (doisPontos > 3 && doisPontos <= 60) return s.slice(0, doisPontos);
  const frase = s.split(/(?<=[.;])\s/)[0];
  if (frase.length <= 60) return frase.replace(/[.;]$/, "");
  const corte = frase.slice(0, 58);
  return `${corte.slice(0, corte.lastIndexOf(" "))}…`;
}
