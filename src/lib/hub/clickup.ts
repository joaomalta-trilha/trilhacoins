import { normalizarNome } from "./texto";

// Vínculo cliente do Hub ↔ ClickUp (fase 3).
//
// A regra padrão: toda tarefa do ClickUp que é de um cliente (reunião,
// check-in, entrega) leva o cliente no campo suspenso "Clientes". Cada
// cliente do Hub guarda o ID da opção desse campo
// (clientes.clickup_cliente_opcao). A tarefa chega ao cliente por esse ID,
// nunca pelo nome da tarefa: nomes mudam, têm apelido e erro de digitação;
// o ID da opção não muda nem quando a opção é renomeada no ClickUp.
//
// Mais de um cliente do Hub pode apontar para a mesma opção (um grupo que
// o ClickUp trata como um cliente só); a tarefa vale para todos eles.
//
// IDs do ClickUp (campo, listas, opções) não entram no git, que é público:
// as opções vivem no banco (clickup_opcoes_clientes) e os IDs de campo e
// lista virão da configuração do servidor quando a sincronização existir.

export interface OpcaoClickUp {
  id: string;
  nome: string;
}

export type ComoSugeriu = "nome-igual" | "nome-contido";

export interface Sugestao {
  opcao: OpcaoClickUp;
  como: ComoSugeriu;
}

function palavras(nome: string): string[] {
  return normalizarNome(nome).split(" ").filter(Boolean);
}

function contem(maior: string[], menor: string[]): boolean {
  return menor.length > 0 && menor.every((p) => maior.includes(p));
}

/**
 * Sugere a opção do campo "Clientes" para um cliente do Hub:
 * 1. nome igual, sem contar acento, caixa, espaço e pontuação;
 * 2. senão, nome contido: todas as palavras de um estão no outro
 *    ("Hotel Exemplo" ↔ "Hotel Exemplo Centro"). Vale a candidata com mais
 *    palavras em comum; empate entre duas = sem sugestão.
 * Sem sugestão, quem decide é a gestão: o Hub nunca chuta.
 */
export function sugerirOpcao(nomeCliente: string, opcoes: OpcaoClickUp[]): Sugestao | null {
  const chave = normalizarNome(nomeCliente);
  if (!chave) return null;
  const iguais = opcoes.filter((o) => normalizarNome(o.nome) === chave);
  if (iguais.length === 1) return { opcao: iguais[0], como: "nome-igual" };
  if (iguais.length > 1) return null;

  const doCliente = palavras(nomeCliente);
  let melhor: OpcaoClickUp[] = [];
  let melhorTamanho = 0;
  for (const o of opcoes) {
    const daOpcao = palavras(o.nome);
    if (!contem(doCliente, daOpcao) && !contem(daOpcao, doCliente)) continue;
    const emComum = daOpcao.filter((p) => doCliente.includes(p)).length;
    if (emComum > melhorTamanho) {
      melhor = [o];
      melhorTamanho = emComum;
    } else if (emComum === melhorTamanho) {
      melhor.push(o);
    }
  }
  return melhor.length === 1 ? { opcao: melhor[0], como: "nome-contido" } : null;
}

/** Nome da opção como o ClickUp mostra, sem os espaços que sobram nas pontas. */
export function nomeDaOpcao(o: OpcaoClickUp): string {
  return o.nome.trim();
}
