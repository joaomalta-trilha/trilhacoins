import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  Check,
  ClipboardList,
  Coins,
  ExternalLink,
  Flag,
  MessageCircle,
  Users,
} from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, type ClienteRow, listarClientes, obterDossiesDe } from "@/lib/data/hub";
import { obterPainelAssessor } from "@/lib/data/repo";
import { buscarReunioes } from "@/lib/data/clickup";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { paraFazerDoAssessor } from "@/lib/hub/inicio";
import {
  contarClientesComReuniao,
  mesDe,
  montarLinhasDeReunioes,
  nomeDoMes,
  reunioesPorCliente,
  vencidasDoMes,
} from "@/lib/hub/reunioes";
import { agoraEmMaceio, montarRotina, ritosDoDia } from "@/lib/hub/rotina";
import { primeiroNome } from "@/lib/hub/texto";
import { AvisoMigracao, Cena, Chip, EmBreve, Faixa, Ic, PaginaTopo, Seta } from "@/components/hub/basicos";
import { SeletorVerComo } from "@/components/hub/ver-como";
import { Barra, fmt } from "@/components/ui";

export const metadata = { title: "Início" };

const SITUACAO: Record<string, string> = {
  equilibrada: "carteira equilibrada para o nível",
  "quase-completa": "carteira perto do limite do nível",
  completa: "carteira completa para o nível",
  "sem-nivel": "nível da carteira a definir",
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function CartaoAtencao({ clientes }: { clientes: ClienteRow[] }) {
  if (clientes.length === 0) {
    return (
      <div className="card calma">
        <Ic>
          <Check strokeWidth={1.6} />
        </Ic>
        <b style={{ marginTop: 10 }}>Ninguém pede atenção agora</b>
        <p>Quando a coordenação marcar um cliente da carteira, ele aparece aqui antes de tudo.</p>
      </div>
    );
  }
  const visiveis = clientes.slice(0, 6);
  const resto = clientes.length - visiveis.length;
  return (
    <div className="card quente">
      <div className="card-hd">
        <Ic>
          <Flag strokeWidth={1.6} />
        </Ic>
        <span className="num">{clientes.length}</span>
      </div>
      <div className="card-t">
        {clientes.length === 1 ? "Pede atenção" : "Pedem atenção"}
        <small>Marcados pela coordenação. Comece por eles.</small>
      </div>
      <div className={`lista-chips${visiveis.length > 3 ? " duas" : ""}`}>
        {visiveis.map((c) => (
          <Link key={c.id} href={`/clientes/${c.slug}`} className="chip-linha">
            <span>{c.nome}</span>
            <ArrowUpRight strokeWidth={1.8} aria-hidden="true" />
          </Link>
        ))}
        {resto > 0 && (
          <Link href="/clientes?filtro=atencao" className="chip-linha mais">
            e mais {resto}
          </Link>
        )}
      </div>
    </div>
  );
}

/** Indicador que ainda não existe: chega com o WhatsApp da Trilha (fase 4). */
function IndicadorEmBreve({ icone, titulo, sobre }: { icone: React.ReactNode; titulo: string; sobre: string }) {
  return (
    <div className="card indicador-em-breve">
      <div className="card-hd">
        <Ic>{icone}</Ic>
        <Chip>fase 4</Chip>
      </div>
      <div className="card-t">
        {titulo}
        <small>{sobre}</small>
      </div>
      <div className="card-ft">
        <span className="em-breve-rotulo">Chega com o WhatsApp da Trilha</span>
      </div>
    </div>
  );
}

/**
 * Início do assessor: a visão geral do dia. Os indicadores da carteira e o
 * que pede ação agora. A rotina da semana e as reuniões, em detalhe, ficam
 * na Assessoria.
 */
export default async function InicioPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  if (ctx.modo === "gestao") redirect("/gestao");

  const alvo = ctx.assessorAlvo;
  const agora = new Date();
  const { saudacao, diaUtil, rotuloDia } = agoraEmMaceio(agora);
  const ehOProprio = ctx.sessao.papel === "assessor";
  const nomeNaTela = ehOProprio ? primeiroNome(ctx.sessao.nome) : alvo ? primeiroNome(alvo.nome) : "";

  let visiveis: ClienteRow[] = [];
  let migracaoPendente = false;
  try {
    visiveis = await listarClientes();
  } catch (e) {
    if (!(e instanceof MigracaoPendenteError)) throw e;
    migracaoPendente = true;
  }
  const clientes = visiveis.filter((c) => alvo && c.assessorId === alvo.id && c.status !== "saiu");

  const [painel, dossies, leitura] = await Promise.all([
    alvo ? obterPainelAssessor(alvo.id).catch(() => undefined) : Promise.resolve(undefined),
    migracaoPendente ? Promise.resolve(new Map<string, string>()) : obterDossiesDe(clientes.map((c) => c.id)),
    alvo && !migracaoPendente ? buscarReunioes(agora) : Promise.resolve(null),
  ]);

  const resumo = resumirCarteira(clientes.map((c) => c.exigenciaPts), alvo?.nivel);
  const pedemAtencao = clientes
    .filter((c) => c.pedeAtencao)
    .sort((a, b) => (b.exigenciaPts ?? 0) - (a.exigenciaPts ?? 0) || a.nome.localeCompare(b.nome));

  // rotina de hoje e reuniões do mês, para os indicadores e o "Para fazer"
  const hoje = ritosDoDia(montarRotina(clientes, dossies), diaUtil);
  const mes = mesDe(agora);
  const nomeMes = nomeDoMes(mes).replace(/ de \d{4}$/, "");
  const { porCliente } = reunioesPorCliente(leitura?.ok ? leitura.reunioes : [], visiveis);
  const linhas = montarLinhasDeReunioes({
    clientes,
    porCliente,
    dossies,
    nomeDoAssessor: new Map(),
    nomeDaPessoa: new Map(),
    mes,
    agora,
  });
  const conta = contarClientesComReuniao(linhas);
  const vencidas = vencidasDoMes(porCliente, clientes, mes);
  const itens = paraFazerDoAssessor({ vencidas, linhas, ritosHoje: hoje, diaUtil, nomeDoMes: nomeMes });
  const pctReunioes = conta.clientes ? Math.round((conta.comReuniao / conta.clientes) * 100) : 0;

  const resumoDoDia = [
    !diaUtil
      ? "Fim de semana, sem ritos. Na segunda, o relatório sai até 10h20."
      : hoje.ritos
        ? `Hoje são ${plural(hoje.ritos, "rito", "ritos")} em ${plural(hoje.clientes, "cliente", "clientes")}.`
        : "Nenhum rito marcado para hoje nos dossiês da carteira.",
    leitura?.ok && conta.clientes
      ? `Em ${nomeMes}, ${conta.comReuniao} de ${plural(conta.clientes, "cliente", "clientes")} já tiveram reunião.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Cena>
        <PaginaTopo
          titulo={`${saudacao}${nomeNaTela ? `, ${nomeNaTela}` : ""}`}
          lede={
            <>
              {rotuloDia}. {resumoDoDia}
              {!ehOProprio && alvo ? ` Você está vendo o Hub como ${alvo.nome} vê.` : ""}
            </>
          }
          lado={<CartaoAtencao clientes={pedemAtencao} />}
        >
          <SeletorVerComo opcoes={ctx.opcoesVerComo} selecionadoId={alvo?.id ?? null} />
        </PaginaTopo>

        {!alvo && (
          <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
            Seu acesso está liberado, mas ainda não foi vinculado a um assessor. Peça à diretoria para escolher o seu nome
            em Usuários.
          </div>
        )}
        {migracaoPendente && (
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        )}

        <section aria-labelledby="t-indicadores">
          <h2 id="t-indicadores" className="sr-only">
            Indicadores da carteira
          </h2>
          <div className="grade6">
            <Link href="/assessoria#reunioes" className="card">
              <div className="card-hd">
                <Ic ponto={vencidas.length > 0}>
                  <CalendarDays strokeWidth={1.6} />
                </Ic>
                <Seta />
              </div>
              <div className="card-t">
                Reuniões · {nomeMes}
                <small>clientes com pelo menos uma reunião feita</small>
              </div>
              <div className="card-ft">
                {leitura?.ok ? (
                  <span className="num">
                    {conta.comReuniao}
                    <small>de {plural(conta.clientes, "cliente", "clientes")}</small>
                  </span>
                ) : (
                  <span className="em-breve-rotulo">O ClickUp não respondeu agora</span>
                )}
              </div>
              {leitura?.ok && <Barra pct={pctReunioes} />}
            </Link>

            <Link href="/assessoria#rotina" className="card">
              <div className="card-hd">
                <Ic>
                  <ClipboardList strokeWidth={1.6} />
                </Ic>
                <Seta />
              </div>
              <div className="card-t">
                Rotina de hoje
                <small>ritos dos dossiês da carteira</small>
              </div>
              <div className="card-ft">
                {diaUtil ? (
                  <span className="num">
                    {hoje.ritos}
                    <small>{hoje.ritos ? `em ${plural(hoje.clientes, "cliente", "clientes")}` : "ritos"}</small>
                  </span>
                ) : (
                  <span className="num palavra">Fim de semana</span>
                )}
              </div>
            </Link>

            <Link href="/clientes" className="card">
              <div className="card-hd">
                <Ic>
                  <Briefcase strokeWidth={1.6} />
                </Ic>
                <Seta />
              </div>
              <div className="card-t">
                Carteira{alvo?.nivel ? ` · ${alvo.nivel}` : ""}
                <small>
                  {plural(clientes.length, "cliente", "clientes")} · {SITUACAO[resumo.situacao]}
                </small>
              </div>
              <div className="card-ft">
                <span className="num">
                  {resumo.pts}
                  <small>{resumo.teto ? `de ${resumo.teto.pts} pontos` : "pontos de exigência"}</small>
                </span>
              </div>
              {resumo.teto && (
                <div className={`sit-${resumo.situacao}`}>
                  <Barra pct={resumo.pct ?? 0} />
                </div>
              )}
            </Link>

            {painel ? (
              <Link href="/coins" className="card">
                <div className="card-hd">
                  <Ic>
                    <Coins strokeWidth={1.6} />
                  </Ic>
                  <Seta />
                </div>
                <div className="card-t">
                  Trilha Coins · {painel.nivelAtual}
                  <small>
                    {painel.proximoNivel
                      ? `${Math.round(painel.pctNivel)}% do caminho até ${painel.proximoNivel}`
                      : "nível máximo da trilha"}
                  </small>
                </div>
                <div className="card-ft">
                  <span className="num">
                    {fmt(painel.saldo)}
                    <small>coins</small>
                  </span>
                </div>
                {painel.proximoNivel && <Barra pct={painel.pctNivel} />}
              </Link>
            ) : (
              <div className="card">
                <div className="card-hd">
                  <Ic>
                    <Coins strokeWidth={1.6} />
                  </Ic>
                </div>
                <div className="card-t">
                  Trilha Coins
                  <small>o painel de coins aparece quando houver um mês fechado</small>
                </div>
              </div>
            )}

            <IndicadorEmBreve
              icone={<MessageCircle strokeWidth={1.6} />}
              titulo="SLA de resposta no grupo"
              sobre="tempo até o time responder o cliente no grupo de WhatsApp"
            />
            <IndicadorEmBreve
              icone={<Users strokeWidth={1.6} />}
              titulo="Pontos de contato"
              sobre="conversas com cada cliente na semana (a meta é 3)"
            />
          </div>
        </section>
      </Cena>

      <Faixa rotulo="Para fazer e próximas fases">
        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Para fazer</h2>
            {itens.length > 0 && (
              <span className="cnt">
                <b>{itens.length}</b>
                {itens.length === 1 ? "item" : "itens"}
              </span>
            )}
            <p>O que pede ação agora, pelas reuniões do mês e pela rotina de hoje. O detalhe de tudo está na Assessoria.</p>
          </div>
          {itens.length ? (
            <ul className="para-fazer">
              {itens.map((i) => (
                <li key={i.chave}>
                  <a
                    href={i.href}
                    className={`para-fazer-item tom-${i.tom}`}
                    {...(i.externo ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    <i className="para-fazer-ponto" aria-hidden="true" />
                    <span className="para-fazer-texto">
                      <b>{i.titulo}</b>
                      <small>{i.detalhe}</small>
                    </span>
                    {i.externo ? (
                      <ExternalLink strokeWidth={1.6} aria-hidden="true" />
                    ) : (
                      <ArrowUpRight strokeWidth={1.8} aria-hidden="true" />
                    )}
                    {i.externo && <span className="sr-only">(abre no ClickUp)</span>}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="vazio-escuro">Nada pedindo ação agora: reuniões do mês em dia e nenhum rito para hoje.</p>
          )}
        </div>

        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Chega nas próximas fases</h2>
          </div>
          <div className="grade-2">
            <EmBreve titulo="Tarefas em atraso" fase="fase 3">
              Suas tarefas vencidas e as que vencem hoje no ClickUp, antes de virarem atrasadas às 18h.
            </EmBreve>
            <EmBreve titulo="Mensagens a responder" fase="fase 4">
              Clientes esperando resposta no grupo e insatisfações abertas, com o prazo de 24h úteis.
            </EmBreve>
          </div>
        </div>
      </Faixa>
    </>
  );
}
