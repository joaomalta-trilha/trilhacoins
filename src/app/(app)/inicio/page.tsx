import Link from "next/link";
import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, type ClienteRow, listarClientes, obterDossiesDe } from "@/lib/data/hub";
import { obterPainelAssessor } from "@/lib/data/repo";
import { DIAS_UTEIS, type DiaUtil, lerDossie, lerRotina, resumoDoItem } from "@/lib/hub/dossie";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { primeiroNome } from "@/lib/hub/texto";
import { AvisoMigracao, Chip, EmBreve, Estrelas } from "@/components/hub/basicos";
import { SeletorVerComo } from "@/components/hub/ver-como";
import { Barra, fmt, rotuloMes } from "@/components/ui";

const FUSO = "America/Maceio";

function agoraEmMaceio() {
  const agora = new Date();
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO }).format(agora);
  const data = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO }).format(agora);
  const nome = diaSemana.split("-")[0].toLowerCase();
  const indice = ["segunda", "terça", "quarta", "quinta", "sexta"].indexOf(nome);
  return {
    saudacao: hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite",
    diaUtil: (indice >= 0 ? DIAS_UTEIS[indice] : null) as DiaUtil | null,
    rotuloDia: `${diaSemana}, ${data}`,
  };
}

const SITUACAO: Record<string, string> = {
  equilibrada: "Carteira equilibrada para o seu nível",
  "quase-completa": "Carteira perto do limite do seu nível",
  completa: "Carteira completa para o seu nível",
  "sem-nivel": "Nível da carteira a definir",
};

export default async function InicioPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  if (ctx.modo === "gestao") redirect("/gestao");

  const alvo = ctx.assessorAlvo;
  const { saudacao, diaUtil, rotuloDia } = agoraEmMaceio();
  const ehOProprio = ctx.sessao.papel === "assessor";
  const nomeNaTela = ehOProprio ? primeiroNome(ctx.sessao.nome) : alvo ? primeiroNome(alvo.nome) : "";

  let clientes: ClienteRow[] = [];
  let migracaoPendente = false;
  try {
    clientes = (await listarClientes()).filter((c) => alvo && c.assessorId === alvo.id && c.status !== "saiu");
  } catch (e) {
    if (!(e instanceof MigracaoPendenteError)) throw e;
    migracaoPendente = true;
  }

  const [painel, dossies] = await Promise.all([
    alvo ? obterPainelAssessor(alvo.id).catch(() => undefined) : Promise.resolve(undefined),
    migracaoPendente ? Promise.resolve(new Map<string, string>()) : obterDossiesDe(clientes.map((c) => c.id)),
  ]);

  const resumo = resumirCarteira(clientes.map((c) => c.exigenciaPts), alvo?.nivel);
  const pedemAtencao = clientes.filter((c) => c.pedeAtencao);
  const rotinaDeHoje = diaUtil
    ? clientes
        .map((c) => {
          const md = dossies.get(c.id);
          const itens = md ? (lerRotina(lerDossie(md))?.dias[diaUtil] ?? []) : [];
          return { cliente: c, itens: itens.map(resumoDoItem) };
        })
        .filter((r) => r.itens.length > 0)
    : [];

  return (
    <>
      <header className="pagina-topo">
        <p className="rotulo">{rotuloDia}</p>
        <h1>
          {saudacao}
          {nomeNaTela ? `, ${nomeNaTela}` : ""}
        </h1>
        {!ehOProprio && (
          <p className="lede">Você está vendo o Hub como o assessor vê. Escolha de quem é a visão:</p>
        )}
        <SeletorVerComo opcoes={ctx.opcoesVerComo} selecionadoId={alvo?.id ?? null} />
      </header>

      {!alvo && (
        <div className="aviso aviso-atencao">
          Seu acesso está liberado, mas ainda não foi vinculado a um assessor. Peça à diretoria para escolher o seu nome em
          Usuários.
        </div>
      )}
      {migracaoPendente && <AvisoMigracao />}

      <div className="grade-metricas">
        <Link href="/clientes" className="card metrica">
          <span className="rotulo">Carteira</span>
          <b className="metrica-num">{clientes.length}</b>
          <span className="metrica-nota">
            {clientes.length === 1 ? "cliente" : "clientes"}
            {pedemAtencao.length ? ` · ${pedemAtencao.length} ${pedemAtencao.length === 1 ? "pede" : "pedem"} atenção` : ""}
          </span>
          {resumo.teto && (
            <>
              <Barra pct={resumo.pct ?? 0} cor={resumo.situacao === "completa" ? "var(--trilha-laranja-escuro)" : undefined} />
              <span className="metrica-nota">
                {resumo.pts} de {resumo.teto.pts} pontos de exigência · {SITUACAO[resumo.situacao]}
              </span>
            </>
          )}
        </Link>

        <Link href="/coins" className="card metrica escuro">
          <span className="rotulo">Trilha Coins</span>
          {painel ? (
            <>
              <b className="metrica-num">{fmt(painel.saldo)}</b>
              <span className="metrica-nota">coins · nível {painel.nivelAtual}</span>
              {painel.proximoNivel && (
                <>
                  <Barra pct={painel.pctNivel} />
                  <span className="metrica-nota">
                    {Math.round(painel.pctNivel)}% rumo a {painel.proximoNivel}
                    {painel.checkpointProvavel ? ` · promoção provável em ${rotuloMes(painel.checkpointProvavel)}` : ""}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="metrica-nota">Seu painel aparece quando houver um mês fechado.</span>
          )}
        </Link>
      </div>

      <section className="secao">
        <div className="secao-topo">
          <h2>Rotina de hoje</h2>
          {diaUtil && <span className="muted pequeno">{diaUtil}</span>}
        </div>
        {!diaUtil ? (
          <p className="muted">Fim de semana: sem ritos. Na segunda, o relatório sai até 10h20.</p>
        ) : rotinaDeHoje.length === 0 ? (
          <p className="muted">Nenhum rito de hoje nos dossiês da sua carteira.</p>
        ) : (
          <div className="rotina-hoje">
            {rotinaDeHoje.map(({ cliente, itens }) => (
              <Link key={cliente.id} href={`/clientes/${cliente.slug}`} className="card rotina-cliente">
                <div className="cartao-topo">
                  <b>{cliente.nome}</b>
                  {cliente.pedeAtencao && <Chip tom="acento">Pede atenção</Chip>}
                </div>
                <ul>
                  {itens.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        )}
      </section>

      {pedemAtencao.length > 0 && (
        <section className="secao">
          <h2>Pedem atenção</h2>
          <div className="lista-simples">
            {pedemAtencao.map((c) => (
              <Link key={c.id} href={`/clientes/${c.slug}`} className="linha-cliente">
                <b>{c.nome}</b>
                <Estrelas pts={c.exigenciaPts} />
                <span className="muted">{c.frase || c.objetivo}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="secao">
        <h2>Chega nas próximas fases</h2>
        <div className="grade-3">
          <EmBreve titulo="Reuniões do mês" fase="fase 3">
            Realizadas contra as esperadas pela frequência combinada no dossiê, vindas da lista 🗣️ Reuniões do ClickUp.
          </EmBreve>
          <EmBreve titulo="Tarefas em atraso" fase="fase 3">
            Suas tarefas vencidas e as que vencem hoje no ClickUp, antes de virarem “atrasada” às 18h.
          </EmBreve>
          <EmBreve titulo="Mensagens a responder" fase="fase 4">
            Clientes esperando resposta no grupo e insatisfações abertas, com o prazo de 24h úteis.
          </EmBreve>
        </div>
      </section>
    </>
  );
}
