import type { Meta } from "./types";

// §5.2 e §5.3 do briefing — seed inicial das tabelas `metas` e
// `faixas_pontuacao`. Vive em dado, não em código: mudar um teto ou
// uma faixa é editar este array (ou, em produção, a linha no banco),
// nunca alterar o motor de cálculo.

export const METAS: Meta[] = [
  {
    codigo: "3.1",
    nome: "Nota de relacionamento",
    tipo: "escala",
    grupo: "recorrente",
    teto: 300,
    ordem: 1,
    faixas: [
      { rotulo: "Excelente", coins: 300, ordem: 1 },
      { rotulo: "Boa", coins: 150, ordem: 2 },
      { rotulo: "Insatisfatória", coins: 0, ordem: 3 },
    ],
  },
  {
    codigo: "3.2",
    nome: "Taxa de churn",
    tipo: "escala",
    grupo: "recorrente",
    teto: 200,
    ordem: 2,
    faixas: [
      { rotulo: "0 churns", coins: 200, ordem: 1 },
      { rotulo: "1 churn", coins: 50, ordem: 2 },
      { rotulo: "2+ churns", coins: 0, ordem: 3 },
    ],
  },
  {
    codigo: "3.3",
    nome: "Adesão a feedback",
    tipo: "escala",
    grupo: "recorrente",
    teto: 200,
    ordem: 3,
    faixas: [
      { rotulo: "Muito", coins: 200, ordem: 1 },
      { rotulo: "Razoável", coins: 100, ordem: 2 },
      { rotulo: "Pouco", coins: 50, ordem: 3 },
      { rotulo: "Nenhum", coins: 0, ordem: 4 },
    ],
  },
  {
    codigo: "3.4",
    nome: "Entregas no prazo",
    tipo: "percentual",
    grupo: "recorrente",
    teto: 200,
    ordem: 4,
    faixas: [
      { rotulo: "≥ 90%", valorMinimo: 90, coins: 200, ordem: 1 },
      { rotulo: "80–89%", valorMinimo: 80, coins: 100, ordem: 2 },
      { rotulo: "70–79%", valorMinimo: 70, coins: 50, ordem: 3 },
      { rotulo: "< 70%", valorMinimo: 0, coins: 0, ordem: 4 },
    ],
  },
  {
    codigo: "3.5",
    nome: "Reuniões com clientes",
    tipo: "percentual",
    grupo: "recorrente",
    teto: 200,
    ordem: 5,
    faixas: [
      { rotulo: "≥ 90%", valorMinimo: 90, coins: 200, ordem: 1 },
      { rotulo: "70–89%", valorMinimo: 70, coins: 100, ordem: 2 },
      { rotulo: "50–69%", valorMinimo: 50, coins: 50, ordem: 3 },
      { rotulo: "< 50%", valorMinimo: 0, coins: 0, ordem: 4 },
    ],
  },
  {
    codigo: "3.6",
    nome: "Presença e cultura",
    tipo: "escala",
    grupo: "recorrente",
    teto: 200,
    ordem: 6,
    faixas: [
      { rotulo: "Excelente", coins: 200, ordem: 1 },
      { rotulo: "Bom", coins: 100, ordem: 2 },
      { rotulo: "Regular", coins: 50, ordem: 3 },
      { rotulo: "Insatisfatório", coins: 0, ordem: 4 },
    ],
  },
  {
    codigo: "3.7",
    nome: "Upsell de serviços",
    tipo: "escala",
    grupo: "bonus",
    teto: null,
    ordem: 7,
    faixas: [
      { rotulo: "Acima de R$ 2.000", coins: 300, ordem: 1 },
      { rotulo: "R$ 1.000 a 2.000", coins: 200, ordem: 2 },
      { rotulo: "R$ 500 a 1.000", coins: 100, ordem: 3 },
      { rotulo: "Até R$ 500", coins: 50, ordem: 4 },
      { rotulo: "Nenhum", coins: 0, ordem: 5 },
    ],
  },
  {
    codigo: "3.8",
    nome: "Indicação de novos clientes",
    tipo: "contagem",
    grupo: "bonus",
    teto: null,
    ordem: 8,
    porUnidade: 300,
    faixas: [],
  },
  {
    codigo: "3.9",
    nome: "Certificações",
    tipo: "livre",
    grupo: "bonus",
    teto: null,
    ordem: 9,
    faixas: [],
  },
];

export const METAS_RECORRENTES = METAS.filter((m) => m.grupo === "recorrente");
export const METAS_BONUS = METAS.filter((m) => m.grupo === "bonus");

const porCodigo = new Map(METAS.map((m) => [m.codigo, m]));

export function metaPorCodigo(codigo: string): Meta {
  const m = porCodigo.get(codigo);
  if (!m) throw new Error(`Meta desconhecida: ${codigo}`);
  return m;
}
