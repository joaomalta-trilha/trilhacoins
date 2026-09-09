import type { Nivel, RequisitoMacroNivel } from "./types";

// §5.1 — níveis e custos de promoção. Seed inicial da tabela `niveis`.
export const NIVEIS: Nivel[] = [
  { codigo: "Júnior I", nome: "Júnior I", ordem: 1, custoPromocao: 2700 },
  { codigo: "Júnior II", nome: "Júnior II", ordem: 2, custoPromocao: 4000 },
  { codigo: "Júnior III", nome: "Júnior III", ordem: 3, custoPromocao: 6800 },
  { codigo: "Pleno I", nome: "Pleno I", ordem: 4, custoPromocao: 8100 },
  { codigo: "Pleno II", nome: "Pleno II", ordem: 5, custoPromocao: 8100 },
  { codigo: "Pleno III", nome: "Pleno III", ordem: 6, custoPromocao: 8100 },
  { codigo: "Sênior I", nome: "Sênior I", ordem: 7, custoPromocao: 12200 },
  { codigo: "Sênior II", nome: "Sênior II", ordem: 8, custoPromocao: 12200 },
  { codigo: "Sênior III", nome: "Sênior III", ordem: 9, custoPromocao: 16200 },
  { codigo: "Partner", nome: "Partner", ordem: 10, custoPromocao: null },
];

// §5.4 — pré-requisitos qualitativos de macro-nível. Saldo suficiente
// não efetiva a promoção nestas três transições.
export const REQUISITOS_MACRO_NIVEL: RequisitoMacroNivel[] = [
  { nivelOrigem: "Júnior III", descricao: "Avaliação de autonomia nas contas" },
  { nivelOrigem: "Pleno III", descricao: "Gestão autônoma de pelo menos uma conta complexa" },
  {
    nivelOrigem: "Sênior III",
    descricao: "Validação da diretoria, com histórico de receita e retenção",
  },
];

const porCodigo = new Map(NIVEIS.map((n) => [n.codigo, n]));

export function nivelPorCodigo(codigo: string): Nivel {
  const n = porCodigo.get(codigo);
  if (!n) throw new Error(`Nível desconhecido: ${codigo}`);
  return n;
}

export function proximoNivel(codigo: string): Nivel | null {
  const atual = nivelPorCodigo(codigo);
  return NIVEIS.find((n) => n.ordem === atual.ordem + 1) ?? null;
}

export function requisitoMacroDoNivel(codigo: string): string | null {
  return REQUISITOS_MACRO_NIVEL.find((r) => r.nivelOrigem === codigo)?.descricao ?? null;
}
