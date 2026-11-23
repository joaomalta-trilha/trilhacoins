import { semAcento } from "./texto";

// Nota de exigência da carteira (Trilha do Assessor, "Sua carteira"):
// cada cliente soma sete critérios e vira de 1 a 5 estrelas; cada
// macro-nível de assessor tem um teto de pontos e de clientes 4 e 5
// estrelas. A regra vive aqui, testada, e as telas só a consomem.

export type Estrelas = 1 | 2 | 3 | 4 | 5;
export type MacroNivel = "junior" | "pleno" | "senior" | "partner";

export const EXIGENCIA_MIN = 7;
export const EXIGENCIA_MAX = 25;

export const CRITERIOS_EXIGENCIA: { criterio: string; nota1: string; nota2: string; nota3: string; pesoMaximo: number }[] = [
  { criterio: "Volume de demandas", nota1: "Poucas entregas fixas, sem variação", nota2: "Volume moderado e previsível", nota3: "Alto volume ou picos frequentes", pesoMaximo: 4 },
  { criterio: "Complexidade técnica", nota1: "Campanhas simples, sem integração", nota2: "Funis, públicos segmentados, testes", nota3: "Funis avançados, Make, chatbot, Google e Meta", pesoMaximo: 4 },
  { criterio: "Relacionamento", nota1: "Cliente autônomo, raramente questiona", nota2: "Participativo, aceita alinhamentos", nota3: "Exigente, pede gestão ativa de expectativa", pesoMaximo: 3 },
  { criterio: "Canais", nota1: "1 canal", nota2: "2 canais", nota3: "3 ou mais canais", pesoMaximo: 3 },
  { criterio: "Urgência", nota1: "Tudo planejado com antecedência", nota2: "Urgência 1 ou 2 vezes por mês", nota3: "Urgências frequentes, prazos apertados", pesoMaximo: 3 },
  { criterio: "Reuniões", nota1: "Sem reunião fixa", nota2: "1 reunião por mês", nota3: "2 ou mais por mês, presença constante", pesoMaximo: 3 },
  { criterio: "Importância", nota1: "Menos relevante, sem valor estratégico", nota2: "Relevante, contrato saudável", nota3: "Perfil ideal, contrato alto, estratégico", pesoMaximo: 5 },
];

export const FAIXAS_ESTRELAS: { de: number; ate: number; estrelas: Estrelas; exigencia: string; indicado: string }[] = [
  { de: 7, ate: 10, estrelas: 1, exigencia: "Baixa", indicado: "Qualquer nível" },
  { de: 11, ate: 13, estrelas: 2, exigencia: "Moderada para baixa", indicado: "Qualquer nível" },
  { de: 14, ate: 17, estrelas: 3, exigencia: "Moderada", indicado: "Pleno ou sênior" },
  { de: 18, ate: 21, estrelas: 4, exigencia: "Alta", indicado: "Pleno experiente ou sênior" },
  { de: 22, ate: 25, estrelas: 5, exigencia: "Máxima", indicado: "Sênior, no máximo 2 por carteira" },
];

/** Pontos de exigência (7 a 25) → estrelas. Fora da faixa ou vazio → null. */
export function estrelasDaExigencia(pts: number | null | undefined): Estrelas | null {
  if (pts == null || !Number.isFinite(pts) || pts < EXIGENCIA_MIN || pts > EXIGENCIA_MAX) return null;
  return FAIXAS_ESTRELAS.find((f) => pts <= f.ate)!.estrelas;
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
