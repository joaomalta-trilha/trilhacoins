// Utilitários de mês de referência. Uma "chave de mês" é sempre uma
// string "AAAA-MM" (equivalente ao dia 1 do mês, conforme §4 —
// coluna `mes` de `apuracoes`).

const CHECKPOINTS = [3, 6, 9, 12];

export function mesChave(ano: number, mesNumero1a12: number): string {
  return `${ano}-${String(mesNumero1a12).padStart(2, "0")}`;
}

export function partesDaChave(chave: string): { ano: number; mes: number } {
  const [ano, mes] = chave.split("-").map(Number);
  return { ano, mes };
}

/** Chave do mês corrente, a partir da data real de hoje (§6: as projeções nunca usam o mês do filtro). */
export function mesAtualChave(hoje: Date = new Date()): string {
  return mesChave(hoje.getFullYear(), hoje.getMonth() + 1);
}

export function somarMeses(chave: string, n: number): string {
  const { ano, mes } = partesDaChave(chave);
  const d = new Date(ano, mes - 1 + n, 1);
  return mesChave(d.getFullYear(), d.getMonth() + 1);
}

/** Diferença em meses entre duas chaves (`ate` − `de`). Negativa se `ate` for anterior a `de`. */
export function mesesEntre(de: string, ate: string): number {
  const a = partesDaChave(de);
  const b = partesDaChave(ate);
  return (b.ano - a.ano) * 12 + (b.mes - a.mes);
}

export function ehCheckpoint(chave: string): boolean {
  return CHECKPOINTS.includes(partesDaChave(chave).mes);
}

/** Primeiro checkpoint (mar/jun/set/dez) igual ou posterior à chave dada — inclusive. */
export function primeiroCheckpointEmOuApos(chave: string): string {
  const { ano, mes } = partesDaChave(chave);
  const alvo = CHECKPOINTS.find((m) => m >= mes);
  return alvo ? mesChave(ano, alvo) : mesChave(ano + 1, CHECKPOINTS[0]);
}

export function compararChaves(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
