import { describe, expect, it } from "vitest";
import { campo, lerDossie, lerRotina, secao, textoDaSecao } from "./dossie";
import {
  RITOS,
  aplicarRespostas,
  escreverValor,
  lerLista,
  lerValor,
  respostasDoDossie,
  respostasVazias,
  statusDoCadastro,
  validarRespostas,
  type RespostasDossie,
} from "./formulario-dossie";

// Cliente e respostas fictícios.
const CLIENTE = { nome: "Exemplo Imóveis", squad: "Norte", assessor: "Fulano", frase: "Imobiliária de lançamentos." };

function respostasDeExemplo(): RespostasDossie {
  return {
    ...respostasVazias(),
    status: "Ativo",
    contato: "A gerente de marketing fala no grupo; o sócio aprova a verba",
    objetivo: ["Conversas no WhatsApp", "Vendas ou reservas no site"],
    meta: "80 contatos por mês a até R$ 40 cada",
    verbaMeta: "3000",
    verbaGoogle: "0",
    pagamento: "Cartão",
    canais: ["Meta", "Google"],
    contaMeta: "Exemplo Imóveis Oficial",
    crm: ["Kommo"],
    crmAcesso: "Dá para liberar",
    integracoes: ["Make", "Formulário ou LP"],
    integracoesOutro: "planilha de acompanhamento",
    produtos: "Residencial Exemplo\nLoteamento Teste",
    ritos: ["Seg: relatório e foco da semana", "Ter: feedback comercial"],
    relatorio: "Semanal",
    reuniao: "Mensal",
    cuidados: "Não citar preço.",
    desafio: "Atendimento lento dos corretores.",
  };
}

const EXISTENTE = `# Exemplo Imóveis

**Pede atenção**, segundo a coordenação.

- Em uma frase: Imobiliária de lançamentos.
- Squad e assessor: Norte · Fulano
- Objetivo: Vender unidades e fortalecer a marca.
- Meta: 10 contatos qualificados por semana.
- Verba mensal no Meta: R$ 5.000
- Pagamento da mídia: Boleto
- Canais: Meta e Google.

## Rotina da semana
**Segunda**
- Check-in: tópico na task de check-in.

## Desafio
Acompanhar o atendimento dos corretores.

## SWOT
### Forças
- Base de corretores grande.
`;

describe("aplicarRespostas num cliente sem dossiê", () => {
  const md = aplicarRespostas(null, respostasDeExemplo(), CLIENTE);
  const d = lerDossie(md);

  it("escreve o cabeçalho no formato que as telas leem", () => {
    expect(d.titulo).toBe("Exemplo Imóveis");
    expect(campo(d, "Em uma frase")).toBe("Imobiliária de lançamentos.");
    expect(campo(d, "Squad e assessor")).toBe("Norte · Fulano");
    expect(campo(d, "Objetivo")).toBe("Conversas no WhatsApp, Vendas ou reservas no site");
    expect(campo(d, "Verba mensal no Meta")).toBe("R$ 3.000");
    expect(campo(d, "Pagamento")).toBe("Cartão");
    expect(campo(d, "Produtos")).toBe("Residencial Exemplo; Loteamento Teste");
    expect(textoDaSecao(secao(d, "Cuidados"))).toBe("Não citar preço.");
    expect(textoDaSecao(secao(d, "Desafio"))).toBe("Atendimento lento dos corretores.");
  });

  it("os ritos marcados viram a rotina da semana no Início", () => {
    const r = lerRotina(d);
    expect(r?.dias.Segunda).toEqual(["Relatório e foco da semana", "Conferir: Make, Formulário ou LP, planilha de acompanhamento"]);
    expect(r?.dias.Terça).toEqual(["Feedback comercial"]);
    expect(r?.observacoes).toEqual(["Relatório: Semanal · Reunião de resultados: Mensal"]);
  });

  it("lido de volta, dá as mesmas respostas", () => {
    const { respostas, hoje } = respostasDoDossie(md, "ativo");
    expect(hoje).toEqual({});
    expect(respostas).toEqual({ ...respostasDeExemplo(), produtos: "Residencial Exemplo; Loteamento Teste" });
  });
});

describe("aplicarRespostas num dossiê que já existe", () => {
  it("troca só o que foi respondido e mantém rotina, SWOT e o resto", () => {
    const r = { ...respostasVazias(), meta: "20 contatos por semana", desafio: "Resposta lenta no WhatsApp." };
    const md = aplicarRespostas(EXISTENTE, r, CLIENTE);
    const d = lerDossie(md);
    expect(campo(d, "Meta")).toBe("20 contatos por semana");
    expect(textoDaSecao(secao(d, "Desafio"))).toBe("Resposta lenta no WhatsApp.");
    // em branco não apaga
    expect(campo(d, "Verba mensal no Meta")).toBe("R$ 5.000");
    expect(campo(d, "Pagamento")).toBe("Boleto");
    expect(campo(d, "Objetivo")).toBe("Vender unidades e fortalecer a marca.");
    // o resto fica intacto
    expect(d.intro).toEqual(["**Pede atenção**, segundo a coordenação."]);
    expect(textoDaSecao(secao(d, "Rotina da semana"))).toContain("Check-in: tópico na task de check-in.");
    expect(textoDaSecao(secao(d, "SWOT"))).toContain("Base de corretores grande.");
  });

  it("texto livre do dossiê vai para 'Outro' e volta igual ao salvar", () => {
    const { respostas, hoje } = respostasDoDossie(EXISTENTE, "pausado");
    expect(respostas.status).toBe("Pausado");
    expect(respostas.objetivo).toEqual([]);
    expect(respostas.objetivoOutro).toBe("Vender unidades e fortalecer a marca.");
    expect(respostas.pagamento).toBe("Boleto");
    expect(respostas.verbaMeta).toBe("5000");
    // "Meta e Google." não é uma lista das opções: a tela mostra o texto de hoje
    expect(respostas.canais).toEqual([]);
    expect(hoje.canais).toBe("Meta e Google.");
    const md = aplicarRespostas(EXISTENTE, respostas, CLIENTE);
    const d = lerDossie(md);
    expect(campo(d, "Objetivo")).toBe("Vender unidades e fortalecer a marca.");
    expect(campo(d, "Canais")).toBe("Meta e Google.");
    expect(campo(d, "Verba mensal no Meta")).toBe("R$ 5.000");
    expect(campo(d, "Status")).toBe("Pausado");
  });

  it("dossiê sem rotina do assistente ganha a seção quando os ritos são marcados", () => {
    const md = aplicarRespostas(EXISTENTE, { ...respostasVazias(), ritos: [RITOS[0]] }, CLIENTE);
    expect(textoDaSecao(secao(lerDossie(md), "Rotina do assistente"))).toBe(
      "- Mensagens da semana que valem: Seg: relatório e foco da semana"
    );
  });
});

describe("leitura das respostas", () => {
  it("cliente sem dossiê começa com todos os ritos marcados", () => {
    const { respostas } = respostasDoDossie(null, "ativo");
    expect(respostas.ritos).toEqual([...RITOS]);
    expect(respostas.status).toBe("Ativo");
  });

  it("lista: reconhece as opções, separa o resto em 'Outro'", () => {
    expect(lerLista("Meta, Google", ["Meta", "Google", "TikTok"], false)).toEqual({
      marcadas: ["Meta", "Google"],
      outro: "",
      reconhecida: true,
    });
    expect(lerLista("Kommo, planilha de leads", ["Kommo"], true)).toEqual({
      marcadas: ["Kommo"],
      outro: "planilha de leads",
      reconhecida: true,
    });
    expect(lerLista("Meta e Google.", ["Meta", "Google"], false).reconhecida).toBe(false);
  });

  it("valores em reais", () => {
    expect(escreverValor("19600")).toBe("R$ 19.600");
    expect(escreverValor("R$ 1500,50")).toBe("R$ 1.500,50");
    expect(escreverValor("Incluída no valor acima.")).toBe("Incluída no valor acima.");
    expect(lerValor("R$ 19.600")).toBe("19600");
    expect(lerValor("R$ 19.600 por mês, somando Meta e Google.")).toBe("R$ 19.600 por mês, somando Meta e Google.");
  });
});

describe("validarRespostas", () => {
  it("aceita só as opções da lista", () => {
    const r = validarRespostas({ ...respostasDeExemplo(), canais: ["Meta", "Orkut"] });
    expect(r.canais).toEqual(["Meta"]);
    expect(() => validarRespostas({ pagamento: "Cheque" })).toThrow("Escolha uma das opções");
    expect(() => validarRespostas("x")).toThrow("Respostas inválidas");
  });

  it("status do formulário vira o status do cadastro", () => {
    expect(statusDoCadastro("Saiu")).toBe("saiu");
    expect(statusDoCadastro("Pausado")).toBe("pausado");
    expect(statusDoCadastro("Ativo")).toBe("ativo");
  });
});
