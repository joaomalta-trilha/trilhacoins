import { campo, lerDossie, lerFrequencias, secao, textoDaSecao } from "./dossie";

// Formulário do dossiê, nativo no Hub. As perguntas são as mesmas do
// formulário que a coordenação respondia fora do Hub; as respostas viram
// linhas do próprio dossiê (o Markdown continua sendo a fonte única, com
// versão a cada gravação).
//
// Regra de ouro ao gravar: resposta em branco não apaga nada do que já
// está escrito no dossiê. Só o que foi respondido substitui a linha; o
// resto (rotina dia a dia, SWOT, leitura da conta) fica intacto.

export const STATUS_FORM = ["Ativo", "Pausado", "Saiu"] as const;
export const OBJETIVOS = [
  "Contatos por formulário",
  "Conversas no WhatsApp",
  "Vendas ou reservas no site",
  "Visitas ao perfil e marca",
  "Ingressos ou inscrições",
] as const;
export const PAGAMENTOS = ["Cartão", "Boleto", "Pix (saldo pré-pago)", "Não sei"] as const;
export const CANAIS = ["Meta", "Google", "LinkedIn", "TikTok", "E-mail", "Disparo de WhatsApp"] as const;
export const CRMS = ["Kommo", "RD Station CRM", "Pipedrive", "Moskit", "Planilha", "Não tem"] as const;
export const ACESSOS_CRM = ["Já tem", "Dá para liberar", "Não dá", "Não se aplica"] as const;
export const INTEGRACOES = [
  "Make",
  "BotConversa",
  "MyIA",
  "Weni",
  "RD Station Marketing",
  "API de conversões",
  "Formulário ou LP",
  "Google Meu Negócio",
] as const;
export const RITOS = [
  "Seg: relatório e foco da semana",
  "Ter: feedback comercial",
  "Ter: leads parados há mais de 7 dias",
  "Qua: referências de conteúdo",
  "Qui: top criativo",
  "Sex: pontos positivos e próximos passos",
] as const;
export const FREQ_RELATORIO = ["Semanal", "Quinzenal", "Mensal", "Não recebe"] as const;
export const FREQ_REUNIAO = ["Semanal", "Quinzenal", "Mensal", "Sob demanda", "Não tem"] as const;

export interface RespostasDossie {
  status: string;
  contato: string;
  objetivo: string[];
  objetivoOutro: string;
  meta: string;
  verbaMeta: string;
  verbaGoogle: string;
  pagamento: string;
  canais: string[];
  contaMeta: string;
  crm: string[];
  crmOutro: string;
  crmAcesso: string;
  integracoes: string[];
  integracoesOutro: string;
  produtos: string;
  ritos: string[];
  relatorio: string;
  reuniao: string;
  cuidados: string;
  desafio: string;
}

export type ChaveUma = "status" | "pagamento" | "crmAcesso" | "relatorio" | "reuniao";
export type ChaveVarias = "objetivo" | "canais" | "crm" | "integracoes" | "ritos";
export type ChaveOutro = "objetivoOutro" | "crmOutro" | "integracoesOutro";
export type ChaveTexto = "contato" | "meta" | "verbaMeta" | "verbaGoogle" | "contaMeta" | "produtos" | "cuidados" | "desafio";

/** `curto` é o nome da pergunta nas listas ("faltam: Meta, Canais"). */
export type Pergunta =
  | { tipo: "uma"; chave: ChaveUma; curto: string; pergunta: string; opcoes: readonly string[] }
  | { tipo: "varias"; chave: ChaveVarias; curto: string; pergunta: string; opcoes: readonly string[]; outro?: ChaveOutro }
  | { tipo: "texto" | "area" | "valor"; chave: ChaveTexto; curto: string; pergunta: string; dica?: string };

export interface BlocoDoFormulario {
  titulo: string;
  /** uma lista dentro da lista = perguntas lado a lado */
  perguntas: (Pergunta | Pergunta[])[];
}

export const BLOCOS_DO_DOSSIE: BlocoDoFormulario[] = [
  {
    titulo: "Situação e contato",
    perguntas: [
      { tipo: "uma", chave: "status", curto: "Situação", pergunta: "Esse cliente segue ativo?", opcoes: STATUS_FORM },
      {
        tipo: "texto",
        chave: "contato",
        curto: "Contato e decisor",
        pergunta: "Quem fala com a gente no grupo, e quem decide?",
        dica: "Ex.: a gerente de marketing fala no grupo; quem aprova a verba é o sócio",
      },
    ],
  },
  {
    titulo: "Objetivo e meta",
    perguntas: [
      { tipo: "varias", chave: "objetivo", curto: "Objetivo", pergunta: "O que é resultado para esse cliente?", opcoes: OBJETIVOS, outro: "objetivoOutro" },
      {
        tipo: "texto",
        chave: "meta",
        curto: "Meta",
        pergunta: "Qual é a meta combinada com ele?",
        dica: "Ex.: 80 contatos por mês a até R$ 40 cada. Se não há meta, escreva: sem meta",
      },
    ],
  },
  {
    titulo: "Verba e canais",
    perguntas: [
      [
        { tipo: "valor", chave: "verbaMeta", curto: "Verba no Meta", pergunta: "Verba mensal no Meta (R$)", dica: "Ex.: 3000" },
        { tipo: "valor", chave: "verbaGoogle", curto: "Verba no Google", pergunta: "Verba mensal no Google (R$)", dica: "0 se não anuncia" },
      ],
      { tipo: "uma", chave: "pagamento", curto: "Pagamento da mídia", pergunta: "Como a mídia é paga?", opcoes: PAGAMENTOS },
      { tipo: "varias", chave: "canais", curto: "Canais", pergunta: "Em quais canais a gente anuncia ou dispara?", opcoes: CANAIS },
      {
        tipo: "texto",
        chave: "contaMeta",
        curto: "Conta no Meta",
        pergunta: "Como a conta de anúncios aparece no Gerenciador do Meta?",
        dica: "Nome da conta ou do negócio",
      },
    ],
  },
  {
    titulo: "CRM e integrações",
    perguntas: [
      { tipo: "varias", chave: "crm", curto: "CRM", pergunta: "Qual CRM o cliente usa?", opcoes: CRMS, outro: "crmOutro" },
      { tipo: "uma", chave: "crmAcesso", curto: "Acesso ao CRM", pergunta: "O assistente pode ter acesso de leitura a esse CRM?", opcoes: ACESSOS_CRM },
      {
        tipo: "varias",
        chave: "integracoes",
        curto: "Integrações",
        pergunta: "O que precisa estar funcionando toda segunda?",
        opcoes: INTEGRACOES,
        outro: "integracoesOutro",
      },
    ],
  },
  {
    titulo: "Campanha e rotina",
    perguntas: [
      { tipo: "area", chave: "produtos", curto: "Produtos em campanha", pergunta: "Quais produtos ou empreendimentos estão em campanha agora?" },
      { tipo: "varias", chave: "ritos", curto: "Mensagens da semana", pergunta: "Quais mensagens da semana valem para esse cliente?", opcoes: RITOS },
      [
        { tipo: "uma", chave: "relatorio", curto: "Relatório", pergunta: "Com que frequência ele recebe relatório?", opcoes: FREQ_RELATORIO },
        { tipo: "uma", chave: "reuniao", curto: "Reunião", pergunta: "E reunião de resultados?", opcoes: FREQ_REUNIAO },
      ],
    ],
  },
  {
    titulo: "Cuidados e desafio",
    perguntas: [
      {
        tipo: "area",
        chave: "cuidados",
        curto: "Cuidados",
        pergunta: "O que não pode ser feito nessa conta, ou pede cuidado?",
        dica: "Ex.: não citar preço; não anunciar fora de Maceió; cliente sensível a troca de público",
      },
      { tipo: "area", chave: "desafio", curto: "Desafio", pergunta: "Qual é o maior desafio desse cliente hoje?" },
    ],
  },
];

export function respostasVazias(): RespostasDossie {
  return {
    status: "Ativo",
    contato: "",
    objetivo: [],
    objetivoOutro: "",
    meta: "",
    verbaMeta: "",
    verbaGoogle: "",
    pagamento: "",
    canais: [],
    contaMeta: "",
    crm: [],
    crmOutro: "",
    crmAcesso: "",
    integracoes: [],
    integracoesOutro: "",
    produtos: "",
    ritos: [],
    relatorio: "",
    reuniao: "",
    cuidados: "",
    desafio: "",
  };
}

// ---------------------------------------------------------------
// leitura: o que já está no dossiê vira resposta marcada
// ---------------------------------------------------------------

const STATUS_DO_BANCO: Record<string, string> = { ativo: "Ativo", pausado: "Pausado", saiu: "Saiu" };

function semPontoFinal(t: string): string {
  return t.trim().replace(/\.$/, "").trim();
}

function mesmo(a: string, b: string): boolean {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;
}

function lerUma(valor: string, opcoes: readonly string[]): string | null {
  const v = semPontoFinal(valor);
  return v ? (opcoes.find((o) => mesmo(o, v)) ?? null) : null;
}

/**
 * "Meta, Google" → as duas marcadas. Item desconhecido vai para "Outro"
 * quando a pergunta aceita; senão a linha não é reconhecida e a tela
 * mostra o texto de hoje para a pessoa marcar.
 */
export function lerLista(
  valor: string,
  opcoes: readonly string[],
  aceitaOutro: boolean
): { marcadas: string[]; outro: string; reconhecida: boolean } {
  const v = semPontoFinal(valor);
  if (!v) return { marcadas: [], outro: "", reconhecida: true };
  const marcadas: string[] = [];
  const desconhecidos: string[] = [];
  for (const item of v.split(/[,;]/).map((s) => s.trim()).filter(Boolean)) {
    const o = opcoes.find((op) => mesmo(op, item));
    if (o) {
      if (!marcadas.includes(o)) marcadas.push(o);
    } else desconhecidos.push(item);
  }
  if (!desconhecidos.length) return { marcadas, outro: "", reconhecida: true };
  if (!aceitaOutro) return { marcadas: [], outro: "", reconhecida: false };
  // nada bate com as opções: guarda o texto como estava, ponto final incluso
  return { marcadas, outro: marcadas.length ? desconhecidos.join(", ") : valor.trim(), reconhecida: true };
}

/** "R$ 19.600" → "19600" para editar; texto livre fica como está. */
export function lerValor(valor: string): string {
  const m = valor.trim().match(/^R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(,\d{1,2})?\.?$/);
  return m ? m[1].replace(/\./g, "") + (m[2] ?? "") : valor.trim();
}

/** "19600" → "R$ 19.600"; texto livre ("incluída no valor acima") fica como está. */
export function escreverValor(texto: string): string {
  const t = texto.trim();
  const m = t.match(/^(?:R\$\s*)?(\d+)(?:,(\d{1,2}))?$/);
  if (!m) return t;
  const inteiro = String(Number(m[1])).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${inteiro}${m[2] ? `,${m[2]}` : ""}`;
}

function linhaDaRotina(texto: string, inicio: string): string {
  const l = texto.split("\n").find((x) => x.replace(/^-\s*/, "").trim().startsWith(inicio));
  return l ? l.replace(/^-\s*/, "").trim().slice(inicio.length).trim() : "";
}

export interface LeituraDoDossie {
  respostas: RespostasDossie;
  /** o texto de hoje das perguntas que não deu para marcar sozinho */
  hoje: Partial<Record<ChaveUma | ChaveVarias, string>>;
}

/** Monta as respostas a partir do dossiê atual (sem dossiê: tudo em branco, todos os ritos marcados). */
export function respostasDoDossie(md: string | null, statusCliente: string): LeituraDoDossie {
  const r = respostasVazias();
  r.status = STATUS_DO_BANCO[statusCliente] ?? "Ativo";
  const hoje: LeituraDoDossie["hoje"] = {};
  if (!md?.trim()) {
    r.ritos = [...RITOS];
    return { respostas: r, hoje };
  }
  const d = lerDossie(md);

  r.contato = campo(d, "Contato");
  r.meta = campo(d, "Meta");
  r.contaMeta = campo(d, "Conta Meta");
  r.produtos = campo(d, "Produtos");
  r.verbaMeta = lerValor(campo(d, "Verba mensal no Meta"));
  r.verbaGoogle = lerValor(campo(d, "Verba mensal no Google"));
  r.cuidados = textoDaSecao(secao(d, "Cuidados"));
  r.desafio = textoDaSecao(secao(d, "Desafio"));

  const umaComTexto = (chave: ChaveUma, valor: string, opcoes: readonly string[]) => {
    const marcada = lerUma(valor, opcoes);
    if (marcada) r[chave] = marcada;
    else if (valor.trim()) hoje[chave] = valor.trim();
  };
  umaComTexto("pagamento", campo(d, "Pagamento"), PAGAMENTOS);
  umaComTexto("crmAcesso", campo(d, "Acesso do assistente ao CRM"), ACESSOS_CRM);
  const freq = lerFrequencias(d);
  umaComTexto("relatorio", freq.relatorio ?? "", FREQ_RELATORIO);
  umaComTexto("reuniao", freq.reuniao ?? "", FREQ_REUNIAO);

  const variasComTexto = (chave: ChaveVarias, outro: ChaveOutro | null, valor: string, opcoes: readonly string[]) => {
    const l = lerLista(valor, opcoes, outro !== null);
    if (!l.reconhecida) {
      hoje[chave] = valor.trim();
      return;
    }
    r[chave] = l.marcadas;
    if (outro) r[outro] = l.outro;
  };
  variasComTexto("objetivo", "objetivoOutro", campo(d, "Objetivo"), OBJETIVOS);
  variasComTexto("canais", null, campo(d, "Canais"), CANAIS);
  variasComTexto("crm", "crmOutro", campo(d, "CRM"), CRMS);
  const rotina = textoDaSecao(secao(d, "Rotina do assistente"));
  variasComTexto("integracoes", "integracoesOutro", linhaDaRotina(rotina, "Conferir toda segunda:"), INTEGRACOES);
  variasComTexto("ritos", null, linhaDaRotina(rotina, "Mensagens da semana que valem:"), RITOS);

  return { respostas: r, hoje };
}

// ---------------------------------------------------------------
// completude: quanto do formulário o dossiê já responde
// ---------------------------------------------------------------

export interface CompletudeDossie {
  respondidas: number;
  total: number;
  /** nomes curtos das perguntas sem resposta, na ordem do formulário */
  faltam: string[];
}

/** A situação vem do cadastro do cliente, então não conta como pergunta em aberto. */
const PERGUNTAS_DO_DOSSIE: Pergunta[] = BLOCOS_DO_DOSSIE.flatMap((b) => b.perguntas.flat()).filter(
  (p) => p.chave !== "status"
);

function respondida(p: Pergunta, r: RespostasDossie, hoje: LeituraDoDossie["hoje"]): boolean {
  if (p.tipo === "uma") return Boolean(r[p.chave] || hoje[p.chave]);
  if (p.tipo === "varias") return r[p.chave].length > 0 || Boolean(p.outro && r[p.outro].trim()) || Boolean(hoje[p.chave]);
  return r[p.chave].trim() !== "";
}

/**
 * Dossiê completo = todas as perguntas do formulário respondidas no texto.
 * Resposta fora das opções também conta: o que vale é ter resposta.
 */
export function completudeDoDossie(md: string | null): CompletudeDossie {
  const total = PERGUNTAS_DO_DOSSIE.length;
  if (!md?.trim()) return { respondidas: 0, total, faltam: PERGUNTAS_DO_DOSSIE.map((p) => p.curto) };
  const { respostas, hoje } = respostasDoDossie(md, "ativo");
  // dossiês importados guardam a conta pelo ID ("Contas: Meta act_123…"): a conta está identificada
  if (!respostas.contaMeta && /\bMeta\s+act_\d+/.test(campo(lerDossie(md), "Contas"))) respostas.contaMeta = "act";
  // sem CRM, a pergunta do acesso ao CRM não se aplica
  if (!respostas.crmAcesso && respostas.crm.length > 0 && respostas.crm.every((c) => c === "Não tem")) {
    respostas.crmAcesso = "Não se aplica";
  }
  const faltam = PERGUNTAS_DO_DOSSIE.filter((p) => !respondida(p, respostas, hoje)).map((p) => p.curto);
  return { respondidas: total - faltam.length, total, faltam };
}

// ---------------------------------------------------------------
// escrita: as respostas entram no dossiê sem apagar o resto
// ---------------------------------------------------------------

export interface ClienteDoDossie {
  nome: string;
  squad: string | null;
  assessor: string | null;
  frase: string | null;
}

function umaLinha(t: string): string {
  return t.replace(/\s*\n+\s*/g, "; ").trim();
}

function lista(marcadas: string[], outro = ""): string {
  return [...marcadas, outro.trim()].filter(Boolean).join(", ");
}

const RE_LINHA_CABECALHO = /^- ([^:]{2,70}): (.*)$/;

/** Troca (ou cria) a linha "- Chave: valor" do cabeçalho; a chave casa pelo começo, como em `campo()`. */
function definirCabecalho(linhas: string[], prefixo: string, chaveNova: string, valor: string): void {
  if (!valor) return;
  const fim = linhas.findIndex((l) => l.startsWith("## "));
  const limite = fim < 0 ? linhas.length : fim;
  for (let i = 0; i < limite; i++) {
    const m = linhas[i].match(RE_LINHA_CABECALHO);
    if (m && m[1].trim().startsWith(prefixo)) {
      linhas[i] = `- ${m[1].trim()}: ${valor}`;
      return;
    }
  }
  let ultimo = -1;
  for (let i = 0; i < limite; i++) if (RE_LINHA_CABECALHO.test(linhas[i])) ultimo = i;
  if (ultimo < 0) ultimo = Math.max(0, linhas.findIndex((l) => l.startsWith("# ")));
  linhas.splice(ultimo + 1, 0, `- ${chaveNova}: ${valor}`);
}

/** Intervalo [início, fim) das linhas de uma seção "## Título…". */
function intervaloDaSecao(linhas: string[], prefixo: string): [number, number] | null {
  const ini = linhas.findIndex((l) => l.startsWith("## ") && l.slice(3).trim().startsWith(prefixo));
  if (ini < 0) return null;
  let fim = linhas.findIndex((l, i) => i > ini && l.startsWith("## "));
  if (fim < 0) fim = linhas.length;
  return [ini, fim];
}

function definirSecao(linhas: string[], titulo: string, texto: string): void {
  const corpo = texto.trim();
  if (!corpo) return;
  const intervalo = intervaloDaSecao(linhas, titulo);
  const novas = [...corpo.split("\n"), ""];
  if (intervalo) linhas.splice(intervalo[0] + 1, intervalo[1] - intervalo[0] - 1, ...novas);
  else linhas.push("", `## ${titulo}`, ...novas);
}

/** Troca (ou acrescenta) uma linha "- Início…" dentro da "Rotina do assistente". */
function definirLinhaDaRotina(linhas: string[], casa: (l: string) => boolean, nova: string): void {
  let intervalo = intervaloDaSecao(linhas, "Rotina do assistente");
  if (!intervalo) {
    // a rotina do assistente vem logo depois do cabeçalho, como nos dossiês do assistente
    const primeira = linhas.findIndex((l) => l.startsWith("## "));
    let pos = primeira < 0 ? linhas.length : primeira;
    if (pos > 0 && linhas[pos - 1].trim()) linhas.splice(pos++, 0, "");
    linhas.splice(pos, 0, "## Rotina do assistente", "");
    intervalo = [pos, pos + 2];
  }
  const [ini, fim] = intervalo;
  for (let i = ini + 1; i < fim; i++) {
    if (casa(linhas[i].replace(/^-\s*/, "").trim())) {
      linhas[i] = `- ${nova}`;
      return;
    }
  }
  let pos = fim;
  while (pos - 1 > ini && !linhas[pos - 1].trim()) pos--;
  linhas.splice(pos, 0, `- ${nova}`);
}

/**
 * Escreve as respostas no dossiê. Sem dossiê, cria um com cabeçalho,
 * rotina do assistente, cuidados e desafio. Com dossiê, troca só as
 * linhas respondidas e preserva todo o resto.
 */
export function aplicarRespostas(md: string | null, r: RespostasDossie, cliente: ClienteDoDossie): string {
  const linhas = md?.trim()
    ? md.replace(/\r\n?/g, "\n").split("\n")
    : [
        `# ${cliente.nome}`,
        "",
        ...(cliente.frase?.trim() ? [`- Em uma frase: ${umaLinha(cliente.frase)}`] : []),
        ...(cliente.squad || cliente.assessor
          ? [`- Squad e assessor: ${[cliente.squad, cliente.assessor].filter(Boolean).join(" · ")}`]
          : []),
      ];

  definirCabecalho(linhas, "Status", "Status", r.status);
  definirCabecalho(linhas, "Contato", "Contato no grupo e quem decide", umaLinha(r.contato));
  definirCabecalho(linhas, "Objetivo", "Objetivo", umaLinha(lista(r.objetivo, r.objetivoOutro)));
  definirCabecalho(linhas, "Meta", "Meta", umaLinha(r.meta));
  definirCabecalho(linhas, "Verba mensal no Meta", "Verba mensal no Meta", umaLinha(escreverValor(r.verbaMeta)));
  definirCabecalho(linhas, "Verba mensal no Google", "Verba mensal no Google", umaLinha(escreverValor(r.verbaGoogle)));
  definirCabecalho(linhas, "Pagamento", "Pagamento da mídia", r.pagamento);
  definirCabecalho(linhas, "Canais", "Canais", lista(r.canais));
  definirCabecalho(linhas, "Conta Meta", "Conta Meta", umaLinha(r.contaMeta));
  definirCabecalho(linhas, "CRM", "CRM", umaLinha(lista(r.crm, r.crmOutro)));
  definirCabecalho(linhas, "Acesso do assistente ao CRM", "Acesso do assistente ao CRM", r.crmAcesso);
  definirCabecalho(linhas, "Produtos", "Produtos em campanha", umaLinha(r.produtos));

  if (r.ritos.length) {
    definirLinhaDaRotina(
      linhas,
      (l) => l.startsWith("Mensagens da semana que valem:"),
      `Mensagens da semana que valem: ${r.ritos.join("; ")}`
    );
  }
  const frequencias = [r.relatorio && `Relatório: ${r.relatorio}`, r.reuniao && `Reunião de resultados: ${r.reuniao}`]
    .filter(Boolean)
    .join(" · ");
  if (frequencias) {
    definirLinhaDaRotina(linhas, (l) => /^Relat[óo]rio:|^Reuni[ãa]o de resultados:/i.test(l), frequencias);
  }
  const conferir = umaLinha(lista(r.integracoes, r.integracoesOutro));
  if (conferir) {
    definirLinhaDaRotina(linhas, (l) => l.startsWith("Conferir toda segunda:"), `Conferir toda segunda: ${conferir}`);
  }

  definirSecao(linhas, "Cuidados", r.cuidados);
  definirSecao(linhas, "Desafio", r.desafio);

  return `${linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}

// ---------------------------------------------------------------
// validação do que chega do navegador
// ---------------------------------------------------------------

const LIMITE_TEXTO = 600;
const LIMITE_AREA = 4000;

/** Confere forma e opções; devolve só o que é válido. Lança erro com mensagem para a tela. */
export function validarRespostas(entrada: unknown): RespostasDossie {
  if (!entrada || typeof entrada !== "object") throw new Error("Respostas inválidas.");
  const e = entrada as Record<string, unknown>;
  const r = respostasVazias();

  const texto = (chave: keyof RespostasDossie, limite: number): string => {
    const v = e[chave];
    if (v === undefined || v === null) return "";
    if (typeof v !== "string") throw new Error("Resposta de texto inválida.");
    const t = v.trim();
    if (t.length > limite) throw new Error(`Uma resposta passou de ${limite} caracteres.`);
    return t;
  };
  const uma = (chave: ChaveUma, opcoes: readonly string[]): string => {
    const t = texto(chave, 80);
    if (t && !opcoes.includes(t)) throw new Error("Escolha uma das opções da lista.");
    return t;
  };
  const varias = (chave: ChaveVarias, opcoes: readonly string[]): string[] => {
    const v = e[chave];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) throw new Error("Escolha inválida.");
    return opcoes.filter((o) => v.includes(o));
  };

  r.status = uma("status", STATUS_FORM) || "Ativo";
  r.pagamento = uma("pagamento", PAGAMENTOS);
  r.crmAcesso = uma("crmAcesso", ACESSOS_CRM);
  r.relatorio = uma("relatorio", FREQ_RELATORIO);
  r.reuniao = uma("reuniao", FREQ_REUNIAO);
  r.objetivo = varias("objetivo", OBJETIVOS);
  r.canais = varias("canais", CANAIS);
  r.crm = varias("crm", CRMS);
  r.integracoes = varias("integracoes", INTEGRACOES);
  r.ritos = varias("ritos", RITOS);
  r.objetivoOutro = texto("objetivoOutro", LIMITE_TEXTO);
  r.crmOutro = texto("crmOutro", LIMITE_TEXTO);
  r.integracoesOutro = texto("integracoesOutro", LIMITE_TEXTO);
  r.contato = texto("contato", LIMITE_TEXTO);
  r.meta = texto("meta", LIMITE_TEXTO);
  r.verbaMeta = texto("verbaMeta", 200);
  r.verbaGoogle = texto("verbaGoogle", 200);
  r.contaMeta = texto("contaMeta", LIMITE_TEXTO);
  r.produtos = texto("produtos", LIMITE_AREA);
  r.cuidados = texto("cuidados", LIMITE_AREA);
  r.desafio = texto("desafio", LIMITE_AREA);
  return r;
}

/** Status do formulário → status do cadastro. */
export function statusDoCadastro(status: string): "ativo" | "pausado" | "saiu" {
  return status === "Pausado" ? "pausado" : status === "Saiu" ? "saiu" : "ativo";
}
