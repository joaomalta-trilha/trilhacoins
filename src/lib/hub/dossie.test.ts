import { describe, expect, it } from "vitest";
import {
  atalhosDoDossie,
  campo,
  contasMeta,
  lerDossie,
  lerFrequencias,
  lerRotina,
  lerSwot,
  linksDeAcesso,
  notasDeAcesso,
  resumoDoItem,
  separarTarefa,
  secao,
  secoesDaConta,
  textoDaSecao,
  urlGerenciadorMeta,
} from "./dossie";

// Dossiê fictício, no mesmo formato dos dossiês reais.
const EXEMPLO = `# Exemplo Imóveis

- Em uma frase: Imobiliária de lançamentos que vende por corretores.
- Squad e assessor: Norte · Fulano
- Objetivo: Vender unidades.
- Meta: 10 contatos qualificados por semana.
- Verba mensal no Meta: R$ 5.000
- Contas: Meta act_1234567890 | Google: a confirmar
- CRM: Kommo. O assistente já tem acesso.

## Rotina do assistente
- Mensagens da semana que valem: Seg: relatório e foco da semana; Ter: feedback comercial; Sex: pontos positivos e próximos passos
- Relatório: Semanal · Reunião de resultados: Quinzenal
- Conferir toda segunda: Formulários.

## Rotina da semana
_Rotina desenhada para vender unidades._

**Segunda**
- Check-in: tópico na task de check-in, com caixinhas.
- Relatório da semana na task de relatórios.

**Terça**
- Feedback comercial pelo Kommo: contatos parados há mais de 7 dias.

**Otimização (terça e quinta)**
- Medida principal: custo por contato atendido.

## Desafio
Acompanhar o atendimento dos corretores.

## Acessos e links
- Pasta no Drive: https://drive.google.com/drive/folders/abc123 (arquivos do cliente)
- Kommo: o assistente já tem acesso
- Senhas não ficam neste arquivo.

## No ar hoje (lido em 13/10/2026)
### Conta Exemplo Principal (9876543210)
- Duas campanhas ativas.

## SWOT
_Rascunho do assistente, a validar._

### Forças
- Base de corretores grande.

### Fraquezas
- Sem meta combinada.

### Oportunidades
- Mercado aquecido.

### Ameaças
- Juros altos.

Fontes do mercado: [Fonte](https://exemplo.com)
`;

describe("lerDossie", () => {
  const d = lerDossie(EXEMPLO);

  it("lê título, cabeçalho e seções", () => {
    expect(d.titulo).toBe("Exemplo Imóveis");
    expect(campo(d, "Objetivo")).toBe("Vender unidades.");
    expect(campo(d, "Verba mensal no Meta")).toBe("R$ 5.000");
    expect(campo(d, "Inexistente")).toBe("");
    expect(d.secoes.map((s) => s.titulo)).toEqual([
      "Rotina do assistente",
      "Rotina da semana",
      "Desafio",
      "Acessos e links",
      "No ar hoje (lido em 13/10/2026)",
      "SWOT",
    ]);
    expect(textoDaSecao(secao(d, "Desafio"))).toBe("Acompanhar o atendimento dos corretores.");
  });

  it("aceita quebras de linha do Windows", () => {
    expect(lerDossie("# A\r\n- Objetivo: X\r\n").cabecalho).toEqual([["Objetivo", "X"]]);
  });
});

describe("lerRotina", () => {
  it("prefere a rotina escrita dia a dia", () => {
    const r = lerRotina(lerDossie(EXEMPLO))!;
    expect(r.intro).toEqual(["_Rotina desenhada para vender unidades._"]);
    expect(r.dias.Segunda).toHaveLength(2);
    expect(r.dias.Terça[0]).toMatch(/^Feedback comercial/);
    expect(r.dias.Quarta).toEqual([]);
    expect(r.extras.map((e) => e.titulo)).toEqual(["Otimização (terça e quinta)"]);
  });

  it("sem rotina da semana, monta os dias pela rotina do assistente", () => {
    const md = EXEMPLO.replace(/## Rotina da semana[\s\S]*?(?=## Desafio)/, "");
    const r = lerRotina(lerDossie(md))!;
    expect(r.dias.Segunda).toEqual(["Relatório e foco da semana", "Conferir: Formulários."]);
    expect(r.dias.Terça).toEqual(["Feedback comercial"]);
    expect(r.dias.Sexta).toEqual(["Pontos positivos e próximos passos"]);
    expect(r.observacoes).toEqual(["Relatório: Semanal · Reunião de resultados: Quinzenal"]);
  });

  it("sem nenhuma rotina, devolve null", () => {
    expect(lerRotina(lerDossie("# A\n## Desafio\nx"))).toBeNull();
  });
});

describe("lerFrequencias", () => {
  it("extrai relatório e reunião de resultados", () => {
    expect(lerFrequencias(lerDossie(EXEMPLO))).toEqual({ relatorio: "Semanal", reuniao: "Quinzenal" });
  });
  it("sem a informação, devolve null", () => {
    expect(lerFrequencias(lerDossie("# A"))).toEqual({ relatorio: null, reuniao: null });
  });
});

describe("lerSwot", () => {
  it("separa os quatro quadrantes, notas e fontes", () => {
    const s = lerSwot(lerDossie(EXEMPLO))!;
    expect(s.forcas).toEqual(["- Base de corretores grande."]);
    expect(s.ameacas).toEqual(["- Juros altos."]);
    expect(s.notas).toEqual(["_Rascunho do assistente, a validar._"]);
    expect(s.fontes[0]).toMatch(/^Fontes do mercado/);
  });
});

describe("contas e acessos", () => {
  it("acha contas do Meta por act_ e por cabeçalho de conta", () => {
    expect(contasMeta(EXEMPLO)).toEqual([
      { id: "9876543210", nome: "Exemplo Principal" },
      { id: "1234567890", nome: null },
    ]);
    expect(urlGerenciadorMeta("123")).toBe(
      "https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=123"
    );
  });

  it("lê links http(s) e notas, ignorando o aviso de senhas", () => {
    const d = lerDossie(EXEMPLO);
    expect(linksDeAcesso(d)).toEqual([
      {
        rotulo: "Pasta no Drive",
        url: "https://drive.google.com/drive/folders/abc123",
        detalhe: "arquivos do cliente",
      },
    ]);
    expect(notasDeAcesso(d)).toEqual(["Kommo: o assistente já tem acesso"]);
  });

  it("não transforma esquemas perigosos em link", () => {
    const d = lerDossie("# A\n## Acessos e links\n- Truque: javascript:alert(1)");
    expect(linksDeAcesso(d)).toEqual([]);
  });

  it("separa as seções que descrevem a conta", () => {
    expect(secoesDaConta(lerDossie(EXEMPLO)).map((s) => s.titulo)).toEqual([
      "No ar hoje (lido em 13/10/2026)",
    ]);
  });
});

describe("atalhosDoDossie", () => {
  it("junta contas do Meta, CRM e links de acesso, sem repetir", () => {
    const atalhos = atalhosDoDossie(lerDossie(EXEMPLO), EXEMPLO);
    expect(atalhos.map((a) => a.nome)).toEqual([
      "Gerenciador de anúncios",
      "Gerenciador de anúncios",
      "Kommo",
      "Pasta no Drive",
    ]);
    expect(atalhos[3]).toMatchObject({ sigla: "D", descricao: "arquivos do cliente" });
  });

  it("mostra Google Ads só para quem anuncia no Google", () => {
    const comGoogle = EXEMPLO.replace("- CRM:", "- Canais: Meta e Google\n- Verba mensal no Google: R$ 2.000\n- CRM:");
    expect(atalhosDoDossie(lerDossie(comGoogle), comGoogle).some((a) => a.nome === "Google Ads")).toBe(true);
    const semVerba = comGoogle.replace("R$ 2.000", "Ainda não anuncia");
    expect(atalhosDoDossie(lerDossie(semVerba), semVerba).some((a) => a.nome === "Google Ads")).toBe(false);
  });
});

describe("resumoDoItem", () => {
  it("usa o rótulo antes dos dois-pontos", () => {
    expect(resumoDoItem("Check-in: tópico na task de check-in")).toBe("Check-in");
  });
  it("usa rótulos de até 60 caracteres antes dos dois-pontos", () => {
    expect(resumoDoItem("Feedback comercial pela planilha de acompanhamento: contatos da semana")).toBe(
      "Feedback comercial pela planilha de acompanhamento"
    );
  });
  it("usa a primeira frase curta", () => {
    expect(resumoDoItem("Referências de conteúdo para os produtos. Confirmar antes.")).toBe(
      "Referências de conteúdo para os produtos"
    );
  });
  it("corta frase longa numa palavra inteira", () => {
    const r = resumoDoItem(
      "Fechamento da semana com unidades vendidas e reservadas e atendimento dos corretores parceiros e próximos passos"
    );
    expect(r.endsWith("…")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(59);
  });
});

describe("separarTarefa", () => {
  it("tira a caixinha das listas de tarefa do Markdown", () => {
    expect(separarTarefa("[ ] Conferir o pixel")).toEqual({ tarefa: true, feita: false, texto: "Conferir o pixel" });
    expect(separarTarefa("[x] Relatório enviado")).toEqual({ tarefa: true, feita: true, texto: "Relatório enviado" });
    expect(separarTarefa("Check-in")).toEqual({ tarefa: false, feita: false, texto: "Check-in" });
  });
  it("o resumo do item não mostra a caixinha", () => {
    expect(resumoDoItem("[ ] A conta está entregando? Conferir saldo.")).toBe("A conta está entregando? Conferir saldo");
  });
});
