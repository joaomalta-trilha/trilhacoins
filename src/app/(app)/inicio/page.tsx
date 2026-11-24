import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, Flag } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, type ClienteRow, listarClientes, obterDossiesDe } from "@/lib/data/hub";
import { obterPainelAssessor } from "@/lib/data/repo";
import { DIAS_UTEIS, type DiaUtil, lerDossie, lerRotina, resumoDoItem } from "@/lib/hub/dossie";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { primeiroNome } from "@/lib/hub/texto";
import { AvisoMigracao, Cena, EmBreve, Faixa, Ic, PaginaTopo, Seta, iniciais } from "@/components/hub/basicos";
import { type ClienteRotina, RotinaDaSemana } from "@/components/hub/rotina-semana";
import { SeletorVerComo } from "@/components/hub/ver-como";
import { Barra, fmt, rotuloMes } from "@/components/ui";

export const metadata = { title: "Início" };

const FUSO = "America/Maceio";

function agoraEmMaceio() {
  const agora = new Date();
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO }).format(agora);
  const data = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO }).format(agora);
  const nome = diaSemana.split("-")[0].toLowerCase();
  const indice = ["segunda", "terça", "quarta", "quinta", "sexta"].indexOf(nome);
  const rotulo = `${diaSemana}, ${data}`;
  return {
    saudacao: hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite",
    diaUtil: (indice >= 0 ? DIAS_UTEIS[indice] : null) as DiaUtil | null,
    rotuloDia: rotulo.charAt(0).toUpperCase() + rotulo.slice(1),
  };
}

const SITUACAO: Record<string, string> = {
  equilibrada: "carteira equilibrada para o nível",
  "quase-completa": "carteira perto do limite do nível",
  completa: "carteira completa para o nível",
  "sem-nivel": "nível da carteira a definir",
};

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
  const pedemAtencao = clientes
    .filter((c) => c.pedeAtencao)
    .sort((a, b) => (b.exigenciaPts ?? 0) - (a.exigenciaPts ?? 0) || a.nome.localeCompare(b.nome));

  const rotina: ClienteRotina[] = clientes.flatMap((c) => {
    const md = dossies.get(c.id);
    const r = md ? lerRotina(lerDossie(md)) : null;
    if (!r) return [];
    const dias = Object.fromEntries(DIAS_UTEIS.map((d) => [d, r.dias[d].map(resumoDoItem)])) as Record<DiaUtil, string[]>;
    if (!DIAS_UTEIS.some((d) => dias[d].length)) return [];
    return [{ slug: c.slug, nome: c.nome, iniciais: iniciais(c.nome), pedeAtencao: c.pedeAtencao, dias }];
  });

  const deHoje = diaUtil ? rotina.filter((c) => c.dias[diaUtil].length) : [];
  const ritosHoje = diaUtil ? deHoje.reduce((s, c) => s + c.dias[diaUtil].length, 0) : 0;
  const resumoDoDia = !diaUtil
    ? "Fim de semana, sem ritos. Na segunda, o relatório sai até 10h20."
    : ritosHoje
      ? `Hoje são ${ritosHoje} ${ritosHoje === 1 ? "rito" : "ritos"} em ${deHoje.length} ${deHoje.length === 1 ? "cliente" : "clientes"}.`
      : "Nenhum rito marcado para hoje nos dossiês da carteira.";

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

        <RotinaDaSemana hoje={diaUtil} clientes={rotina} />
      </Cena>

      <Faixa rotulo="Carteira, Trilha Coins e próximas fases">
        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Carteira e Trilha Coins</h2>
          </div>
          <div className="grade-2">
            <Link href="/clientes" className="painel">
              <div className="painel-hd">
                <span>Carteira{alvo?.nivel ? ` · ${alvo.nivel}` : ""}</span>
                <Seta claro />
              </div>
              <div className="num grande">
                {resumo.pts}
                <small>{resumo.teto ? `de ${resumo.teto.pts} pontos de exigência` : "pontos de exigência"}</small>
              </div>
              {resumo.teto && (
                <div className={`sit-${resumo.situacao}`}>
                  <Barra pct={resumo.pct ?? 0} />
                </div>
              )}
              <p>
                {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"} · {SITUACAO[resumo.situacao]}
                {resumo.excede4 || resumo.excede5 ? " · passou do limite de clientes de 4 e 5 estrelas" : ""}
              </p>
            </Link>

            {painel ? (
              <Link href="/coins" className="painel">
                <div className="painel-hd">
                  <span>Trilha Coins · {painel.nivelAtual}</span>
                  <Seta claro />
                </div>
                <div className="num grande">
                  {fmt(painel.saldo)}
                  <small>coins</small>
                </div>
                {painel.proximoNivel ? (
                  <>
                    <Barra pct={painel.pctNivel} />
                    <p>
                      {Math.round(painel.pctNivel)}% do caminho até {painel.proximoNivel}
                      {painel.checkpointProvavel
                        ? `. Promoção provável em ${rotuloMes(painel.checkpointProvavel)}.`
                        : "."}
                    </p>
                  </>
                ) : (
                  <p>Nível máximo da trilha.</p>
                )}
              </Link>
            ) : (
              <div className="painel">
                <div className="painel-hd">
                  <span>Trilha Coins</span>
                </div>
                <p>O painel de coins aparece quando houver um mês fechado.</p>
              </div>
            )}
          </div>
        </div>

        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Chega nas próximas fases</h2>
          </div>
          <div className="grade-3">
            <EmBreve titulo="Reuniões do mês" fase="fase 3">
              Realizadas contra as esperadas pela frequência combinada no dossiê, vindas da lista de reuniões do ClickUp.
            </EmBreve>
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
