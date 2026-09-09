/** "AAAA-MM" -> "AAAA-MM-01" (colunas `date` do Postgres armazenam sempre o dia 1). */
export function mesParaData(mes: string): string {
  return `${mes}-01`;
}

/** "AAAA-MM-01" (ou qualquer string ISO) -> "AAAA-MM". */
export function dataParaMes(data: string): string {
  return data.slice(0, 7);
}
