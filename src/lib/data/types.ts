// Formas (camelCase) usadas por repo.ts e pelo resto do app — mesma
// forma da etapa 2 (store local), agora preenchidas a partir do
// Supabase. Páginas e Server Actions não precisam mudar.

import type { Papel } from "@/lib/auth/sessao";

export interface AssessorRow {
  id: string;
  nome: string;
  nivel: string;
  saldoInicial: number;
  ativo: boolean;
  entrouEm: string;
}

export type StatusApuracao = "aberta" | "fechada";

export interface ApuracaoRow {
  id: string;
  assessorId: string;
  mes: string; // "AAAA-MM"
  status: StatusApuracao;
  fechadaEm: string | null;
  /** nunca volta a false — sinaliza que este mês já foi reaberto e ajustado ao menos uma vez (§9) */
  foiReaberta: boolean;
}

export interface LancamentoRow {
  id: string;
  apuracaoId: string;
  metaCodigo: string;
  valor: string;
  coins: number;
  lancadoEm: string;
}

export interface PromocaoRow {
  id: string;
  assessorId: string;
  deNivel: string;
  paraNivel: string;
  custo: number;
  checkpoint: string; // "AAAA-MM"
  criadaEm: string;
}

export interface RequisitoMacroRow {
  assessorId: string;
  nivel: string;
  atendido: boolean;
  marcadoEm: string | null;
}

export interface UsuarioRow {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  ativo: boolean;
  /** só relevante quando papel === "coordenacao" — assessores que essa pessoa gerencia */
  carteira: string[];
}

export interface LogRow {
  id: string;
  usuarioEmail: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  valorAnterior: unknown;
  valorNovo: unknown;
  criadoEm: string;
}
