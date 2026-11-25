import { semAcento } from "./texto";

// Nota de exigência da carteira (Trilha do Assessor, "Sua carteira"):
// cada cliente soma sete critérios e vira de 1 a 5 estrelas; cada
// macro-nível de assessor tem um teto de pontos e de clientes 4 e 5
// estrelas. A regra vive aqui, testada, e as telas só a consomem.

export type Estrelas = 1 | 2 | 3 | 4 | 5;
export type MacroNivel = "junior" | "pleno" | "senior" | "partner";

export const EXIGENCIA_MIN = 7;
export const EXIGENCIA_MAX = 25;

export type ChaveCriterio =
  | "volume"
  | "complexidade"
  | "relacionamento"
  | "canais"
  | "urgencia"
  | "reunioes"
  | "importancia";

export interface CriterioExigencia {
  /** chave estável: é ela que fica gravada no banco, nunca o nome */
  chave: ChaveCriterio;
  criterio: string;
  /** referências da planilha de controle de carteira */
  nota1: string;
  nota2: string;
  nota3: string;
  /** cada critério vai de 1 até este peso */
  pesoMaximo: number;
}

// Scorecard da planilha "Controle de Carteira": cada critério recebe de 1
// até o peso máximo; as três notas são a referência de baixo, meio e alto.
export const CRITERIOS_EXIGENCIA: CriterioExigencia[] = [
  {
    chave: "volume",
    criterio: "Volume de demandas",
    nota1: "Poucas entregas fixas por mês, sem variações (1 canal, poucos criativos)",
    nota2: "Volume moderado e previsível (2 canais, criativos recorrentes)",
    nota3: "Alto volume ou picos frequentes (múltiplos lançamentos, muitos criativos)",
    pesoMaximo: 4,
  },
  {
    chave: "complexidade",
    criterio: "Complexidade técnica",
    nota1: "Campanhas simples, sem integrações ou automações (impulsionamento básico)",
    nota2: "Estrutura intermediária (funis, públicos segmentados, testes A/B)",
    nota3: "Alta complexidade: funis avançados, Make, chatbot, Google + Meta, pixel avançado",
    pesoMaximo: 4,
  },
  {
    chave: "relacionamento",
    criterio: "Perfil de relacionamento",
    nota1: "Cliente autônomo, confia no trabalho e raramente questiona decisões",
    nota2: "Cliente participativo, tem opiniões mas aceita alinhamentos com facilidade",
    nota3: "Cliente exigente, questiona frequentemente, precisa de gestão ativa de expectativas",
    pesoMaximo: 3,
  },
  {
    chave: "canais",
    criterio: "Canais gerenciados",
    nota1: "1 canal ativo (ex.: apenas Meta Ads)",
    nota2: "2 canais ativos (ex.: Meta + Google, ou Meta + orgânico)",
    nota3: "3 ou mais canais ativos simultaneamente",
    pesoMaximo: 3,
  },
  {
    chave: "urgencia",
    criterio: "Urgência e imprevisibilidade",
    nota1: "Demandas sempre planejadas com antecedência, sem emergências recorrentes",
    nota2: "Urgências ocasionais (1 a 2 vezes por mês), geralmente gerenciáveis",
    nota3: "Urgências frequentes, mudanças de última hora, prazos apertados",
    pesoMaximo: 3,
  },
  {
    chave: "reunioes",
    criterio: "Reuniões e relacionamento",
    nota1: "Sem reuniões fixas, comunicação assíncrona (WhatsApp, e-mail)",
    nota2: "1 reunião mensal e comunicação ativa no WhatsApp",
    nota3: "2 ou mais reuniões por mês, calls frequentes, cliente quer presença constante",
    pesoMaximo: 3,
  },
  {
    chave: "importancia",
    criterio: "Importância do cliente",
    nota1: "Cliente menos relevante para a empresa, sem fee estratégico",
    nota2: "Cliente relevante, fee saudável, sem ser ICP",
    nota3: "ICP: perfil ideal, alto fee, importância estratégica",
    pesoMaximo: 5,
  },
];

export type NotasCriterios = Partial<Record<ChaveCriterio, number>>;

function notaValida(n: unknown, pesoMaximo: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= pesoMaximo;
}

/** Lê as notas gravadas no banco (jsonb): só ficam as chaves conhecidas com nota válida. */
export function lerNotasCriterios(bruto: unknown): NotasCriterios | null {
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return null;
  const out: NotasCriterios = {};
  for (const c of CRITERIOS_EXIGENCIA) {
    const n = (bruto as Record<string, unknown>)[c.chave];
    if (notaValida(n, c.pesoMaximo)) out[c.chave] = n;
  }
  return Object.keys(out).length ? out : null;
}

/** Soma das notas dos sete critérios; null enquanto faltar algum. */
export function pontosDosCriterios(notas: NotasCriterios | null | undefined): number | null {
  if (!notas) return null;
  let soma = 0;
  for (const c of CRITERIOS_EXIGENCIA) {
    const n = notas[c.chave];
    if (!notaValida(n, c.pesoMaximo)) return null;
    soma += n;
  }
  return soma;
}

/** Confere o que chega do pop-up: as sete notas, inteiras, de 1 ao peso de cada critério. */
export function validarNotasCriterios(entrada: unknown): Record<ChaveCriterio, number> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new Error("Notas inválidas.");
  const out = {} as Record<ChaveCriterio, number>;
  for (const c of CRITERIOS_EXIGENCIA) {
    const n = (entrada as Record<string, unknown>)[c.chave];
    if (n === undefined || n === null) throw new Error(`Falta a nota de ${c.criterio.toLowerCase()}.`);
    if (!notaValida(n, c.pesoMaximo)) throw new Error(`A nota de ${c.criterio.toLowerCase()} vai de 1 a ${c.pesoMaximo}.`);
    out[c.chave] = n;
  }
  return out;
}

export const FAIXAS_ESTRELAS: { de: number; ate: number; estrelas: Estrelas; exigencia: string; indicado: string }[] = [
  { de: 7, ate: 10, estrelas: 1, exigencia: "Baixa", indicado: "Qualquer nível" },
  { de: 11, ate: 13, estrelas: 2, exigencia: "Moderada para baixa", indicado: "Qualquer nível" },
  { de: 14, ate: 17, estrelas: 3, exigencia: "Moderada", indicado: "Pleno ou sênior" },
  { de: 18, ate: 21, estrelas: 4, exigencia: "Alta", indicado: "Pleno experiente ou sênior" },
  { de: 22, ate: 25, estrelas: 5, exigencia: "Máxima", indicado: "Sênior, no máximo 2 por carteira" },
];

/** Pontos de exigência (7 a 25) → estrelas. Fora da faixa ou vazio → null. */
export function estrelasDaExigencia(pts: number | null | undefined): Estrelas | null {
  return faixaDaExigencia(pts)?.estrelas ?? null;
}

/** A faixa inteira (estrelas, exigência e assessor indicado) de uma pontuação. */
export function faixaDaExigencia(pts: number | null | undefined): (typeof FAIXAS_ESTRELAS)[number] | null {
  if (pts == null || !Number.isFinite(pts) || pts < EXIGENCIA_MIN || pts > EXIGENCIA_MAX) return null;
  return FAIXAS_ESTRELAS.find((f) => pts <= f.ate)!;
}

export interface Teto {
  pts: number;
  max4: number;
  max5: number;
}

export const TETO_POR_MACRO: Record<Exclude<MacroNivel, "partner">, Teto> = {
  junior: { pts: 85, max4: 1, max5: 0 },
  pleno: { pts: 120, max4: 2, max5: 1 },
  senior: { pts: 160, max4: 3, max5: 2 },
};

/** "Júnior II" (nível do TrilhaCoins) → "junior". Desconhecido → null. */
export function macroNivel(nivel: string | null | undefined): MacroNivel | null {
  if (!nivel) return null;
  const n = semAcento(nivel).trim().toLowerCase();
  if (n.startsWith("junior")) return "junior";
  if (n.startsWith("pleno")) return "pleno";
  if (n.startsWith("senior")) return "senior";
  if (n.startsWith("partner")) return "partner";
  return null;
}

/** Teto da carteira para o nível. Partner ainda não tem teto definido → null. */
export function tetoDoNivel(nivel: string | null | undefined): Teto | null {
  const m = macroNivel(nivel);
  return m && m !== "partner" ? TETO_POR_MACRO[m] : null;
}

export type SituacaoCarteira = "equilibrada" | "quase-completa" | "completa" | "sem-nivel";

export interface ResumoCarteira {
  clientes: number;
  /** clientes sem nota de exigência — não entram na soma */
  semNota: number;
  pts: number;
  n4: number;
  n5: number;
  teto: Teto | null;
  /** pontos ÷ teto, inteiro; null sem teto */
  pct: number | null;
  situacao: SituacaoCarteira;
  excede4: boolean;
  excede5: boolean;
}

/** Soma a carteira de um assessor e compara com o teto do nível dele. */
export function resumirCarteira(
  pontosPorCliente: (number | null | undefined)[],
  nivel: string | null | undefined
): ResumoCarteira {
  let pts = 0;
  let semNota = 0;
  let n4 = 0;
  let n5 = 0;
  for (const p of pontosPorCliente) {
    const e = estrelasDaExigencia(p);
    if (e === null) {
      semNota++;
      continue;
    }
    pts += p as number;
    if (e === 4) n4++;
    if (e === 5) n5++;
  }
  const teto = tetoDoNivel(nivel);
  const pct = teto ? Math.round((pts / teto.pts) * 100) : null;
  const situacao: SituacaoCarteira =
    pct === null ? "sem-nivel" : pct >= 100 ? "completa" : pct >= 85 ? "quase-completa" : "equilibrada";
  return {
    clientes: pontosPorCliente.length,
    semNota,
    pts,
    n4,
    n5,
    teto,
    pct,
    situacao,
    excede4: teto ? n4 > teto.max4 : false,
    excede5: teto ? n5 > teto.max5 : false,
  };
}
