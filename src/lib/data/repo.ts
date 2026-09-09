import "server-only";

import {
  BASE_MENSAL,
  METAS,
  type Lancamentos,
  type PosicaoRanking,
  type ResultadoPainelAssessor,
  calcularPainelAssessor,
  coinsDaMeta,
  ehCheckpoint,
  mesAtualChave,
  metaPorCodigo,
  montarRankingDePctBase,
  nivelPorCodigo,
  proximoNivel,
  somarMeses,
} from "@/lib/trilhacoins";
import { type Papel, obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { createClient } from "@/lib/supabase/server";
import { dataParaMes, mesParaData } from "./datas";
import type {
  AssessorRow,
  ApuracaoRow,
  LancamentoRow,
  LogRow,
  PromocaoRow,
  StatusApuracao,
  UsuarioRow,
} from "./types";

// Camada de acesso a dados. Mesma API da etapa 2 (era um arquivo JSON
// local); a partir da etapa 3 fala com o Supabase, e o RLS do banco
// (supabase/migrations/0002_rls.sql) filtra por papel de quem pede —
// não é mais o código aqui que decide quem vê o quê, só o que sobra
// depois do filtro do banco (§3 do briefing).
//
// A tabela de pontuação (`metas`/`faixas_pontuacao`/`niveis`) segue
// vindo das constantes de `src/lib/trilhacoins` (não do banco): não
// existe tela para editá-las ainda, então a fonte da verdade prática é
// o código. As tabelas SQL existem e estão seedadas para bater com as
// constantes — quando ganharem uma tela de edição, é aqui que a leitura
// passa a ser via Supabase em vez de import estático.

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// ---------------------------------------------------------------
// erros e log
// ---------------------------------------------------------------

function lancarSeErro(error: { message: string } | null): void {
  if (!error) return;
  if (/row-level security/i.test(error.message)) {
    throw new Error("Sem permissão para esta ação com o seu papel atual.");
  }
  throw new Error(error.message);
}

async function usuarioAtuanteId(): Promise<string> {
  const usuario = await obterUsuarioAutenticado();
  if (!usuario) throw new Error("Sessão expirada. Faça login novamente.");
  return usuario.id;
}

async function registrarLog(
  supabase: SupabaseServerClient,
  params: {
    acao: string;
    entidade: string;
    entidadeId?: string | null;
    valorAnterior?: unknown;
    valorNovo?: unknown;
  }
): Promise<void> {
  const usuario = await obterUsuarioAutenticado();
  const { error } = await supabase.from("log").insert({
    usuario_id: usuario?.id ?? null,
    acao: params.acao,
    entidade: params.entidade,
    entidade_id: params.entidadeId ?? null,
    valor_anterior: params.valorAnterior ?? null,
    valor_novo: params.valorNovo ?? null,
  });
  // log é best-effort: uma falha aqui não deve derrubar a ação principal,
  // que já foi gravada com sucesso antes desta chamada.
  if (error) console.error("Falha ao gravar log:", error.message);
}

// ---------------------------------------------------------------
// conversão de linhas do Supabase (snake_case) para o formato do app
// ---------------------------------------------------------------

interface AssessorRowDB {
  id: string;
  nome: string;
  nivel: string;
  saldo_inicial: number;
  ativo: boolean;
  entrou_em: string;
}
interface ApuracaoRowDB {
  id: string;
  assessor_id: string;
  mes: string;
  status: StatusApuracao;
  fechada_em: string | null;
  foi_reaberta: boolean;
}
interface LancamentoRowDB {
  id: string;
  apuracao_id: string;
  meta_codigo: string;
  valor: string;
  coins: number;
  lancado_em: string;
}
interface PromocaoRowDB {
  id: string;
  assessor_id: string;
  de_nivel: string;
  para_nivel: string;
  custo: number;
  checkpoint: string;
  criada_em: string;
}
interface RequisitoMacroRowDB {
  assessor_id: string;
  nivel: string;
  atendido: boolean;
}

function paraAssessor(r: AssessorRowDB): AssessorRow {
  return {
    id: r.id,
    nome: r.nome,
    nivel: r.nivel,
    saldoInicial: r.saldo_inicial,
    ativo: r.ativo,
    entrouEm: r.entrou_em,
  };
}

function paraApuracao(r: ApuracaoRowDB): ApuracaoRow {
  return {
    id: r.id,
    assessorId: r.assessor_id,
    mes: dataParaMes(r.mes),
    status: r.status,
    fechadaEm: r.fechada_em,
    foiReaberta: r.foi_reaberta,
  };
}

function paraLancamento(r: LancamentoRowDB): LancamentoRow {
  return {
    id: r.id,
    apuracaoId: r.apuracao_id,
    metaCodigo: r.meta_codigo,
    valor: r.valor,
    coins: r.coins,
    lancadoEm: r.lancado_em,
  };
}

function paraPromocao(r: PromocaoRowDB): PromocaoRow {
  return {
    id: r.id,
    assessorId: r.assessor_id,
    deNivel: r.de_nivel,
    paraNivel: r.para_nivel,
    custo: r.custo,
    checkpoint: dataParaMes(r.checkpoint),
    criadaEm: r.criada_em,
  };
}

// ---------------------------------------------------------------
// meses
// ---------------------------------------------------------------

/** Últimos `qtd` meses (mais recente primeiro), a partir da data real de hoje. */
export function listarMesesRecentes(qtd = 14, hoje: Date = new Date()): string[] {
  const atual = mesAtualChave(hoje);
  const lista: string[] = [];
  for (let i = 0; i < qtd; i++) lista.push(somarMeses(atual, -i));
  return lista;
}

/** Padrão de abertura dos filtros (§8.3): o mês anterior — fechamento ocorre na 1ª semana do mês seguinte. */
export function mesReferenciaPadrao(hoje: Date = new Date()): string {
  return somarMeses(mesAtualChave(hoje), -1);
}

// ---------------------------------------------------------------
// snapshot em memória (apurações + lançamentos + promoções +
// requisitos de um conjunto de assessores) — evita N+1 query por
// assessor nas telas que listam todo mundo.
// ---------------------------------------------------------------

interface Snapshot {
  apuracoes: ApuracaoRow[];
  lancamentos: LancamentoRow[];
  promocoes: PromocaoRow[];
  requisitosMacroAtendidos: Set<string>; // chave `${assessorId}::${nivel}`
}

async function carregarSnapshot(
  supabase: SupabaseServerClient,
  assessorIds: string[]
): Promise<Snapshot> {
  if (assessorIds.length === 0) {
    return { apuracoes: [], lancamentos: [], promocoes: [], requisitosMacroAtendidos: new Set() };
  }

  const [apResp, promoResp, reqResp] = await Promise.all([
    supabase.from("apuracoes").select("*").in("assessor_id", assessorIds),
    supabase.from("promocoes").select("*").in("assessor_id", assessorIds),
    supabase.from("requisitos_macro_nivel").select("assessor_id, nivel, atendido").in("assessor_id", assessorIds),
  ]);
  lancarSeErro(apResp.error);
  lancarSeErro(promoResp.error);
  lancarSeErro(reqResp.error);

  const apuracoes = ((apResp.data ?? []) as ApuracaoRowDB[]).map(paraApuracao);
  const apIds = apuracoes.map((a) => a.id);

  let lancamentos: LancamentoRow[] = [];
  if (apIds.length > 0) {
    const { data, error } = await supabase.from("lancamentos").select("*").in("apuracao_id", apIds);
    lancarSeErro(error);
    lancamentos = ((data ?? []) as LancamentoRowDB[]).map(paraLancamento);
  }

  const requisitosMacroAtendidos = new Set(
    ((reqResp.data ?? []) as RequisitoMacroRowDB[])
      .filter((r) => r.atendido)
      .map((r) => `${r.assessor_id}::${r.nivel}`)
  );

  return {
    apuracoes,
    lancamentos,
    promocoes: ((promoResp.data ?? []) as PromocaoRowDB[]).map(paraPromocao),
    requisitosMacroAtendidos,
  };
}

function somarCoinsPorGrupo(lancs: LancamentoRow[]): { recorrente: number; bonus: number } {
  let recorrente = 0;
  let bonus = 0;
  for (const l of lancs) {
    const meta = metaPorCodigo(l.metaCodigo);
    if (meta.grupo === "recorrente") recorrente += l.coins;
    else bonus += l.coins;
  }
  return { recorrente, bonus };
}

function apuracoesFechadasDe(snapshot: Snapshot, assessorId: string) {
  return snapshot.apuracoes
    .filter((a) => a.assessorId === assessorId && a.status === "fechada")
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map((ap) => {
      const lancs = snapshot.lancamentos.filter((l) => l.apuracaoId === ap.id);
      const { recorrente, bonus } = somarCoinsPorGrupo(lancs);
      return { mes: ap.mes, coinsRecorrente: recorrente, coinsBonus: bonus };
    });
}

function metricasExtras(
  apuracoesFechadas: { mes: string; coinsRecorrente: number; coinsBonus: number }[]
): { bonusAcumulado: number; melhorMes: { mes: string; total: number } | null } {
  const bonusAcumulado = apuracoesFechadas.reduce((s, a) => s + a.coinsBonus, 0);
  const melhorMes = apuracoesFechadas.reduce<{ mes: string; total: number } | null>((m, a) => {
    const total = a.coinsRecorrente + a.coinsBonus;
    return !m || total > m.total ? { mes: a.mes, total } : m;
  }, null);
  return { bonusAcumulado, melhorMes };
}

function painelDe(snapshot: Snapshot, assessor: AssessorRow, hoje: Date): ResultadoPainelAssessor {
  const apuracoesFechadas = apuracoesFechadasDe(snapshot, assessor.id);
  const promocoesEfetivadas = snapshot.promocoes
    .filter((p) => p.assessorId === assessor.id)
    .map((p) => ({ custo: p.custo }));

  const mesCorrente = mesAtualChave(hoje);
  const apMesCorrente = snapshot.apuracoes.find(
    (a) => a.assessorId === assessor.id && a.mes === mesCorrente
  );
  const lancsMesCorrente = apMesCorrente
    ? snapshot.lancamentos.filter((l) => l.apuracaoId === apMesCorrente.id)
    : [];
  const { recorrente: recorrenteJaLancadoNoMesCorrente } = somarCoinsPorGrupo(lancsMesCorrente);

  const requisitoAtendido = snapshot.requisitosMacroAtendidos.has(`${assessor.id}::${assessor.nivel}`);

  return calcularPainelAssessor({
    saldoInicial: assessor.saldoInicial,
    nivelAtual: assessor.nivel,
    apuracoesFechadas,
    promocoesEfetivadas,
    recorrenteJaLancadoNoMesCorrente,
    requisitoMacroAtendido: requisitoAtendido,
    hoje,
  });
}

function painelComIdentidadeDe(
  snapshot: Snapshot,
  assessor: AssessorRow,
  hoje: Date
): PainelComIdentidade {
  const apuracoesFechadas = apuracoesFechadasDe(snapshot, assessor.id);
  return {
    ...painelDe(snapshot, assessor, hoje),
    assessorId: assessor.id,
    nome: assessor.nome,
    ...metricasExtras(apuracoesFechadas),
  };
}

// ---------------------------------------------------------------
// assessores
// ---------------------------------------------------------------

export async function listarAssessoresAtivos(): Promise<AssessorRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessores").select("*").eq("ativo", true).order("nome");
  lancarSeErro(error);
  return ((data ?? []) as AssessorRowDB[]).map(paraAssessor);
}

export async function listarAssessores(): Promise<AssessorRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessores").select("*").order("nome");
  lancarSeErro(error);
  return ((data ?? []) as AssessorRowDB[]).map(paraAssessor);
}

export async function obterAssessor(id: string): Promise<AssessorRow | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assessores").select("*").eq("id", id).maybeSingle();
  lancarSeErro(error);
  return data ? paraAssessor(data as AssessorRowDB) : undefined;
}

export interface PainelComIdentidade extends ResultadoPainelAssessor {
  assessorId: string;
  nome: string;
  /** soma dos coins de bônus em todos os meses fechados — métrica histórica (§8.2) */
  bonusAcumulado: number;
  /** melhor mês fechado (recorrente + bônus), para a métrica "Melhor mês" do painel */
  melhorMes: { mes: string; total: number } | null;
}

export async function obterPainelAssessor(
  assessorId: string,
  hoje: Date = new Date()
): Promise<PainelComIdentidade | undefined> {
  const supabase = await createClient();
  const assessor = await obterAssessor(assessorId);
  if (!assessor) return undefined;

  const snapshot = await carregarSnapshot(supabase, [assessorId]);
  return painelComIdentidadeDe(snapshot, assessor, hoje);
}

export async function listarPaineisEquipe(hoje: Date = new Date()): Promise<PainelComIdentidade[]> {
  const supabase = await createClient();
  const assessores = await listarAssessoresAtivos();
  const snapshot = await carregarSnapshot(supabase, assessores.map((a) => a.id));
  return assessores.map((a) => painelComIdentidadeDe(snapshot, a, hoje));
}

export async function atualizarAssessor(
  id: string,
  patch: Partial<Pick<AssessorRow, "nome" | "nivel" | "saldoInicial" | "ativo">>
): Promise<void> {
  const supabase = await createClient();
  const anterior = await obterAssessor(id);
  if (!anterior) throw new Error("Assessor não encontrado.");

  const patchDB: Record<string, unknown> = {};
  if (patch.nome !== undefined) patchDB.nome = patch.nome;
  if (patch.nivel !== undefined) patchDB.nivel = patch.nivel;
  if (patch.saldoInicial !== undefined) patchDB.saldo_inicial = patch.saldoInicial;
  if (patch.ativo !== undefined) patchDB.ativo = patch.ativo;

  const { error } = await supabase.from("assessores").update(patchDB).eq("id", id);
  lancarSeErro(error);

  await registrarLog(supabase, {
    acao: "atualizar_assessor",
    entidade: "assessor",
    entidadeId: id,
    valorAnterior: anterior,
    valorNovo: { ...anterior, ...patch },
  });
}

// ---------------------------------------------------------------
// apurações e lançamentos
// ---------------------------------------------------------------

export type StatusMes = "aberta" | "fechada" | "sem-apuracao";

export async function statusDoMes(mes: string): Promise<StatusMes> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("apuracoes").select("status").eq("mes", mesParaData(mes));
  lancarSeErro(error);
  const doMes = data ?? [];
  if (doMes.length === 0) return "sem-apuracao";
  return doMes.every((a) => a.status === "fechada") ? "fechada" : "aberta";
}

export async function obterLancamentosDoMes(assessorId: string, mes: string): Promise<Lancamentos> {
  const supabase = await createClient();
  const { data: ap, error: e1 } = await supabase
    .from("apuracoes")
    .select("id")
    .eq("assessor_id", assessorId)
    .eq("mes", mesParaData(mes))
    .maybeSingle();
  lancarSeErro(e1);
  if (!ap) return {};

  const { data: lancRows, error: e2 } = await supabase
    .from("lancamentos")
    .select("meta_codigo, valor")
    .eq("apuracao_id", ap.id);
  lancarSeErro(e2);

  const out: Lancamentos = {};
  for (const l of lancRows ?? []) out[l.meta_codigo] = l.valor;
  return out;
}

export interface ResumoMesAssessor {
  assessorId: string;
  nome: string;
  nivel: string;
  lancado: boolean;
  coinsRecorrente: number;
  coinsBonus: number;
  totalMes: number;
  pctBase: number;
}

/** Linha por assessor para a tabela "Apuração do mês" da tela Equipe (§8.1). */
export async function obterResumoMesEquipe(mes: string): Promise<ResumoMesAssessor[]> {
  const supabase = await createClient();
  const assessores = await listarAssessoresAtivos();
  const ids = assessores.map((a) => a.id);
  if (ids.length === 0) return [];

  const { data: apRows, error: e1 } = await supabase
    .from("apuracoes")
    .select("id, assessor_id")
    .in("assessor_id", ids)
    .eq("mes", mesParaData(mes));
  lancarSeErro(e1);
  const apuracoes = apRows ?? [];
  const apIds = apuracoes.map((a) => a.id);

  let lancamentos: { apuracao_id: string; meta_codigo: string; coins: number }[] = [];
  if (apIds.length > 0) {
    const { data, error } = await supabase
      .from("lancamentos")
      .select("apuracao_id, meta_codigo, coins")
      .in("apuracao_id", apIds);
    lancarSeErro(error);
    lancamentos = data ?? [];
  }

  return assessores.map((a) => {
    const ap = apuracoes.find((x) => x.assessor_id === a.id);
    const lancs = ap ? lancamentos.filter((l) => l.apuracao_id === ap.id) : [];
    let recorrente = 0;
    let bonus = 0;
    for (const l of lancs) {
      if (metaPorCodigo(l.meta_codigo).grupo === "recorrente") recorrente += l.coins;
      else bonus += l.coins;
    }
    return {
      assessorId: a.id,
      nome: a.nome,
      nivel: a.nivel,
      lancado: lancs.length > 0,
      coinsRecorrente: recorrente,
      coinsBonus: bonus,
      totalMes: recorrente + bonus,
      pctBase: (recorrente / BASE_MENSAL) * 100,
    };
  });
}

export interface DetalheMetaMes {
  valor: string | undefined;
  coins: number;
}

export async function obterDetalheMes(
  assessorId: string,
  mes: string
): Promise<{ status: StatusMes; foiReaberta: boolean; porMeta: Record<string, DetalheMetaMes> }> {
  const supabase = await createClient();
  const { data: ap, error: e1 } = await supabase
    .from("apuracoes")
    .select("id, status, foi_reaberta")
    .eq("assessor_id", assessorId)
    .eq("mes", mesParaData(mes))
    .maybeSingle();
  lancarSeErro(e1);

  const porMeta: Record<string, DetalheMetaMes> = {};
  for (const m of METAS) porMeta[m.codigo] = { valor: undefined, coins: 0 };

  if (ap) {
    const { data: lancRows, error: e2 } = await supabase
      .from("lancamentos")
      .select("meta_codigo, valor, coins")
      .eq("apuracao_id", ap.id);
    lancarSeErro(e2);
    for (const l of lancRows ?? []) porMeta[l.meta_codigo] = { valor: l.valor, coins: l.coins };
  }

  return {
    status: ap ? (ap.status as StatusMes) : "sem-apuracao",
    foiReaberta: ap?.foi_reaberta ?? false,
    porMeta,
  };
}

/** Histórico dos últimos meses fechados — para o gráfico do painel individual (§8.2). */
export async function obterHistoricoMensal(
  assessorId: string
): Promise<{ mes: string; coinsRecorrente: number; coinsBonus: number }[]> {
  const supabase = await createClient();
  const snapshot = await carregarSnapshot(supabase, [assessorId]);
  return apuracoesFechadasDe(snapshot, assessorId).slice(-12);
}

/**
 * Lança/edita o valor de uma meta. Bloqueia mês fechado — reabra a
 * apuração antes de editar (§7, §9: correção depois do fechamento exige
 * uma reabertura explícita e registrada, nunca uma edição silenciosa).
 * O RLS do banco reforça o mesmo limite por papel (0002_rls.sql).
 */
export async function lancarMeta(params: {
  assessorId: string;
  mes: string;
  metaCodigo: string;
  valor: string; // "" limpa o campo
}): Promise<void> {
  const supabase = await createClient();
  const meta = metaPorCodigo(params.metaCodigo);
  const valorNormalizado: string | number | undefined =
    params.valor === ""
      ? undefined
      : meta.tipo === "percentual" || meta.tipo === "contagem" || meta.tipo === "livre"
        ? Number(params.valor)
        : params.valor;
  const coins = coinsDaMeta(meta, valorNormalizado);
  const usuarioId = await usuarioAtuanteId();

  const { data: apExistente, error: e1 } = await supabase
    .from("apuracoes")
    .select("id, status")
    .eq("assessor_id", params.assessorId)
    .eq("mes", mesParaData(params.mes))
    .maybeSingle();
  lancarSeErro(e1);
  let ap = apExistente;

  if (!ap) {
    const { data: nova, error: e2 } = await supabase
      .from("apuracoes")
      .insert({ assessor_id: params.assessorId, mes: mesParaData(params.mes), status: "aberta" })
      .select("id, status")
      .single();
    lancarSeErro(e2);
    ap = nova;
  }

  if (ap!.status === "fechada") {
    throw new Error("Mês fechado. Reabra a apuração para editar este lançamento.");
  }

  if (params.valor === "") {
    const { error } = await supabase
      .from("lancamentos")
      .delete()
      .eq("apuracao_id", ap!.id)
      .eq("meta_codigo", params.metaCodigo);
    lancarSeErro(error);
    return;
  }

  const { error: e3 } = await supabase.from("lancamentos").upsert(
    {
      apuracao_id: ap!.id,
      meta_codigo: params.metaCodigo,
      valor: params.valor,
      coins,
      lancado_por: usuarioId,
      lancado_em: new Date().toISOString(),
    },
    { onConflict: "apuracao_id,meta_codigo" }
  );
  lancarSeErro(e3);
}

export async function limparLancamentosDoAssessorNoMes(assessorId: string, mes: string): Promise<void> {
  const supabase = await createClient();
  const { data: ap, error: e1 } = await supabase
    .from("apuracoes")
    .select("id, status")
    .eq("assessor_id", assessorId)
    .eq("mes", mesParaData(mes))
    .maybeSingle();
  lancarSeErro(e1);
  if (!ap) return;
  if (ap.status === "fechada") {
    throw new Error("Mês fechado. Reabra a apuração para editar este lançamento.");
  }
  const { error } = await supabase.from("lancamentos").delete().eq("apuracao_id", ap.id);
  lancarSeErro(error);
}

export async function fecharMes(mes: string): Promise<void> {
  const supabase = await createClient();
  const usuarioId = await usuarioAtuanteId();
  const assessores = await listarAssessoresAtivos();
  if (assessores.length === 0) return;

  const linhas = assessores.map((a) => ({
    assessor_id: a.id,
    mes: mesParaData(mes),
    status: "fechada" as const,
    fechada_em: new Date().toISOString(),
    fechada_por: usuarioId,
  }));

  const { error } = await supabase.from("apuracoes").upsert(linhas, { onConflict: "assessor_id,mes" });
  lancarSeErro(error);

  await registrarLog(supabase, { acao: "fechar_mes", entidade: "apuracao", valorNovo: { mes } });
}

export async function reabrirMes(mes: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("apuracoes")
    .update({ status: "aberta", fechada_em: null, fechada_por: null, foi_reaberta: true })
    .eq("mes", mesParaData(mes));
  lancarSeErro(error);

  await registrarLog(supabase, { acao: "reabrir_mes", entidade: "apuracao", valorNovo: { mes } });
}

// ---------------------------------------------------------------
// ranking (§7 — só % da base, pódio nomeado, resto não)
// ---------------------------------------------------------------

/**
 * Ranking do mês via `ranking_mes` (function do banco, ver
 * 0004_nomes_ranking.sql): uma sessão de assessor não consegue ler os
 * lançamentos dos colegas via RLS para recalcular isso na mão — a
 * function já devolve o % da base de cada um, agregado, sem expor a
 * meta a meta de ninguém.
 */
export async function obterRankingMes(mes: string): Promise<PosicaoRanking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ranking_mes", { mes_param: mesParaData(mes) });
  lancarSeErro(error);
  const linhas = (data ?? []) as { assessor_id: string; nome: string; pct_base: number }[];
  return montarRankingDePctBase(
    linhas.map((r) => ({ assessorId: r.assessor_id, nome: r.nome, pctBase: r.pct_base }))
  );
}

// ---------------------------------------------------------------
// promoções e requisito qualitativo de macro-nível (§5.4)
// ---------------------------------------------------------------

export async function marcarRequisitoMacro(
  assessorId: string,
  nivel: string,
  atendido: boolean
): Promise<void> {
  const supabase = await createClient();
  const usuarioId = await usuarioAtuanteId();

  const { error } = await supabase.from("requisitos_macro_nivel").upsert(
    {
      assessor_id: assessorId,
      nivel,
      atendido,
      marcado_por: usuarioId,
      marcado_em: new Date().toISOString(),
    },
    { onConflict: "assessor_id,nivel" }
  );
  lancarSeErro(error);

  await registrarLog(supabase, {
    acao: "marcar_requisito_macro",
    entidade: "assessor",
    entidadeId: assessorId,
    valorNovo: { nivel, atendido },
  });
}

export async function efetivarPromocao(assessorId: string, hoje: Date = new Date()): Promise<void> {
  const supabase = await createClient();
  const usuarioId = await usuarioAtuanteId();

  const assessor = await obterAssessor(assessorId);
  if (!assessor) throw new Error("Assessor não encontrado.");

  const snapshot = await carregarSnapshot(supabase, [assessorId]);
  const painel = painelDe(snapshot, assessor, hoje);
  if (!painel.aptoParaPromover) {
    throw new Error("Assessor não está apto para promoção (saldo insuficiente ou pendência qualitativa).");
  }
  const mesCorrente = mesAtualChave(hoje);
  if (!ehCheckpoint(mesCorrente)) {
    throw new Error("Promoção só pode ser efetivada em mês de checkpoint (mar/jun/set/dez).");
  }
  const proximo = proximoNivel(assessor.nivel);
  const custo = nivelPorCodigo(assessor.nivel).custoPromocao;
  if (!proximo || custo === null) {
    throw new Error("Nível máximo da trilha — não há próxima transição.");
  }

  const { error: e1 } = await supabase.from("promocoes").insert({
    assessor_id: assessorId,
    de_nivel: assessor.nivel,
    para_nivel: proximo.codigo,
    custo,
    checkpoint: mesParaData(mesCorrente),
    aprovada_por: usuarioId,
  });
  lancarSeErro(e1);

  const { error: e2 } = await supabase.from("assessores").update({ nivel: proximo.codigo }).eq("id", assessorId);
  lancarSeErro(e2);

  await registrarLog(supabase, {
    acao: "efetivar_promocao",
    entidade: "assessor",
    entidadeId: assessorId,
    valorAnterior: { nivel: assessor.nivel },
    valorNovo: { nivel: proximo.codigo, custo },
  });
}

export async function listarPromocoes(): Promise<(PromocaoRow & { assessorNome: string })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promocoes")
    .select("*, assessores(nome)")
    .order("criada_em", { ascending: false });
  lancarSeErro(error);

  return ((data ?? []) as (PromocaoRowDB & { assessores: { nome: string } | { nome: string }[] | null })[]).map(
    (p) => {
      const assessor = Array.isArray(p.assessores) ? p.assessores[0] : p.assessores;
      return { ...paraPromocao(p), assessorNome: assessor?.nome ?? "?" };
    }
  );
}

// ---------------------------------------------------------------
// Ajustes — exportação
// ---------------------------------------------------------------

export async function exportarDadosJSON(): Promise<string> {
  const supabase = await createClient();
  const assessores = await listarAssessores();
  const snapshot = await carregarSnapshot(supabase, assessores.map((a) => a.id));
  return JSON.stringify(
    {
      assessores,
      apuracoes: snapshot.apuracoes,
      lancamentos: snapshot.lancamentos,
      promocoes: snapshot.promocoes,
    },
    null,
    2
  );
}

// ---------------------------------------------------------------
// usuários — provisionamento de acesso (§4: cadastro entra inativo no
// primeiro login via trigger de banco; a diretoria aprova papel +
// assessor vinculado aqui).
// ---------------------------------------------------------------

interface UsuarioRowDB {
  id: string;
  email: string;
  papel: Papel;
  assessor_id: string | null;
  ativo: boolean;
}

export async function listarUsuarios(): Promise<UsuarioRow[]> {
  const supabase = await createClient();
  const [usuariosResp, carteiraResp] = await Promise.all([
    supabase.from("usuarios").select("*").order("email"),
    supabase.from("coordenacoes_assessores").select("usuario_id, assessor_id"),
  ]);
  lancarSeErro(usuariosResp.error);
  lancarSeErro(carteiraResp.error);

  const carteiras = (carteiraResp.data ?? []) as { usuario_id: string; assessor_id: string }[];

  return ((usuariosResp.data ?? []) as UsuarioRowDB[])
    .map((u) => ({
      id: u.id,
      email: u.email,
      papel: u.papel,
      assessorId: u.assessor_id,
      ativo: u.ativo,
      carteira: carteiras.filter((c) => c.usuario_id === u.id).map((c) => c.assessor_id),
    }))
    // pendentes de aprovação primeiro — é o que a diretoria precisa ver de cara
    .sort((a, b) => Number(a.ativo) - Number(b.ativo) || a.email.localeCompare(b.email));
}

/** Substitui a carteira de assessores de um coordenador (§7: cada coordenador só vê/edita a própria carteira). */
export async function atualizarCarteiraCoordenador(
  usuarioId: string,
  assessorIds: string[]
): Promise<void> {
  const supabase = await createClient();

  const { error: e1 } = await supabase
    .from("coordenacoes_assessores")
    .delete()
    .eq("usuario_id", usuarioId);
  lancarSeErro(e1);

  if (assessorIds.length > 0) {
    const { error: e2 } = await supabase
      .from("coordenacoes_assessores")
      .insert(assessorIds.map((assessorId) => ({ usuario_id: usuarioId, assessor_id: assessorId })));
    lancarSeErro(e2);
  }

  await registrarLog(supabase, {
    acao: "atualizar_carteira_coordenador",
    entidade: "usuario",
    entidadeId: usuarioId,
    valorNovo: { assessorIds },
  });
}

export async function atualizarUsuario(
  id: string,
  patch: Partial<Pick<UsuarioRow, "papel" | "assessorId" | "ativo">>
): Promise<void> {
  const supabase = await createClient();

  const patchDB: Record<string, unknown> = {};
  if (patch.papel !== undefined) patchDB.papel = patch.papel;
  if (patch.assessorId !== undefined) patchDB.assessor_id = patch.assessorId;
  if (patch.ativo !== undefined) patchDB.ativo = patch.ativo;

  const { error } = await supabase.from("usuarios").update(patchDB).eq("id", id);
  lancarSeErro(error);

  await registrarLog(supabase, {
    acao: "atualizar_usuario",
    entidade: "usuario",
    entidadeId: id,
    valorNovo: patch,
  });
}

// ---------------------------------------------------------------
// log — só diretoria lê (RLS: log_select). §4: quem, o quê, valor
// anterior, valor novo, quando — obrigatório para reabertura e edição
// de mês fechado (já gravado por registrarLog em cada mutação acima).
// ---------------------------------------------------------------

interface LogRowDB {
  id: string;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  valor_anterior: unknown;
  valor_novo: unknown;
  criado_em: string;
  usuarios: { email: string } | { email: string }[] | null;
}

export async function listarLog(limite = 50): Promise<LogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("log")
    .select("*, usuarios(email)")
    .order("criado_em", { ascending: false })
    .limit(limite);
  lancarSeErro(error);

  return ((data ?? []) as LogRowDB[]).map((l) => {
    const usuario = Array.isArray(l.usuarios) ? l.usuarios[0] : l.usuarios;
    return {
      id: l.id,
      usuarioEmail: usuario?.email ?? null,
      acao: l.acao,
      entidade: l.entidade,
      entidadeId: l.entidade_id,
      valorAnterior: l.valor_anterior,
      valorNovo: l.valor_novo,
      criadoEm: l.criado_em,
    };
  });
}
