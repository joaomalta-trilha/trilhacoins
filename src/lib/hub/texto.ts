// Utilitários de texto do Hub — puros, sem dependência de UI ou banco.

/** Remove acentos: "São José" → "Sao Jose". */
export function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Forma canônica para comparar nomes vindos de fontes diferentes
 * (ClickUp, planilha da carteira, formulário do dossiê): sem acento,
 * minúsculo, só letras e números, espaços simples.
 * "  Pousada Exemplo " e "POUSADA EXEMPLO" viram "pousada exemplo".
 */
export function normalizarNome(texto: string): string {
  return semAcento(texto)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Slug estável para URL: "Construtora São José" → "construtora-sao-jose". */
export function slugificar(texto: string): string {
  return normalizarNome(texto).replace(/\s+/g, "-");
}

/** "Fulana de Tal" → "Fulana". Vazio continua vazio. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? "";
}

export function capitalizar(texto: string): string {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto;
}
