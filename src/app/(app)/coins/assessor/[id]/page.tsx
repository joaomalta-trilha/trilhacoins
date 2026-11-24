import { notFound } from "next/navigation";
import { BASE_MENSAL, METAS, rankingParaAssessor, requisitoMacroDoNivel } from "@/lib/trilhacoins";
import { obterSessao } from "@/lib/auth/sessao";
import {
  listarAssessoresAtivos,
  listarMesesRecentes,
  mesReferenciaPadrao,
  obterDetalheMes,
  obterHistoricoMensal,
  obterPainelAssessor,
  obterRankingMes,
} from "@/lib/data/repo";
import { SeletorAssessor } from "@/components/seletor-assessor";
import { SeletorMes } from "@/components/seletor-mes";
import { RequisitoMacroToggle } from "@/components/requisito-macro-toggle";
import { RankingMes } from "@/components/ranking-mes";
import { AnelProgresso, BlocoCheckpoint, GraficoHistorico, MetricaEscura } from "@/components/painel-assessor";
import { Barra, Card, fmt, rotuloMes } from "@/components/ui";

export default async function AssessorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string }>;
}) {
  const { id } = await params;
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesReferenciaPadrao();

  const [sessao, assessores, painel, historico, detalheMes, ranking] = await Promise.all([
    obterSessao(),
    listarAssessoresAtivos(),
    obterPainelAssessor(id),
    obterHistoricoMensal(id),
    obterDetalheMes(id, mes),
    // O ranking é um extra do painel, não o núcleo — uma falha nele
    // (ex.: migration do banco ainda não rodada) não pode derrubar o
    // resto da página.
    obterRankingMes(mes).catch(() => []),
  ]);

  if (!painel) notFound();

  const meses = listarMesesRecentes();
  const { podio, minhaPosicao } = rankingParaAssessor(ranking, id);
  // §8.2: o assessor vendo o próprio painel não tem seletor — só quem
  // gerencia (diretoria/coordenação) troca de assessor por aqui.
  const mostrarSeletor = sessao?.papel !== "assessor";
  const requisitoDescricao = requisitoMacroDoNivel(painel.nivelAtual);
  const recorrenteMes = METAS.filter((m) => m.grupo === "recorrente").reduce(
    (s, m) => s + (detalheMes.porMeta[m.codigo]?.coins ?? 0),
    0
  );
  const bonusMes = METAS.filter((m) => m.grupo === "bonus").reduce(
    (s, m) => s + (detalheMes.porMeta[m.codigo]?.coins ?? 0),
    0
  );
  const pctBaseMes = (recorrenteMes / BASE_MENSAL) * 100;

  return (
    <>
      <div className="coins-cab" style={{ justifyContent: "flex-start" }}>
        {mostrarSeletor ? (
          <SeletorAssessor assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))} selecionadoId={id} />
        ) : (
          <h2>{painel.nome}</h2>
        )}
        <span className="chip">{painel.nivelAtual}</span>
      </div>

      {/* Panorama */}
      <div className="card-escuro" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div className="rotulo">Saldo acumulado</div>
            <div className="saldo-grande" style={{ marginTop: 14 }}>
              {fmt(painel.saldo)}
              <small>coins</small>
            </div>
            <p style={{ fontSize: 14, color: "var(--dark-soft)", marginTop: 16 }}>
              {painel.custoProximaTransicao !== null ? (
                painel.faltaCoins > 0 ? (
                  <>
                    Faltam <strong style={{ color: "var(--accent)" }}>{fmt(painel.faltaCoins)} coins</strong> para{" "}
                    {painel.proximoNivel}.
                  </>
                ) : (
                  <>
                    Saldo suficiente para {painel.proximoNivel}. Efetivação no checkpoint de{" "}
                    {rotuloMes(painel.proximoCheckpoint)}.
                  </>
                )
              ) : (
                "Nível máximo da trilha."
              )}
            </p>
          </div>

          {painel.custoProximaTransicao !== null && <AnelProgresso pct={painel.pctNivel} apto={painel.aptoPorSaldo} />}
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="medidor-rotulo" style={{ fontSize: 12 }}>
            <span>{painel.nivelAtual}</span>
            <span>
              {painel.proximoNivel ?? "—"}
              {painel.custoProximaTransicao ? ` · ${fmt(painel.custoProximaTransicao)} coins` : ""}
            </span>
          </div>
          <Barra pct={painel.pctNivel} alta cor={painel.aptoPorSaldo ? "var(--ok)" : undefined} />
          {painel.mesesAtePromocao && (
            <div className="medidor-rotulo" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              <span>
                Batendo 100% da base: {painel.mesesAtePromocao} {painel.mesesAtePromocao === 1 ? "mês" : "meses"}.
              </span>
            </div>
          )}
        </div>

        <div className="metricas-escuras">
          <MetricaEscura rotulo="Média mensal" valor={fmt(painel.mediaMensal)} nota="últimos 3 meses" />
          <MetricaEscura rotulo="Aproveitamento" valor={`${Math.round(painel.aproveitamento)}%`} nota="da base recorrente" />
          <MetricaEscura
            rotulo="Total já ganho"
            valor={fmt(painel.totalGanho)}
            nota={`${historico.length} ${historico.length === 1 ? "mês lançado" : "meses lançados"}`}
          />
          <MetricaEscura rotulo="Bônus acumulado" valor={fmt(painel.bonusAcumulado)} nota="upsell, indicação, certificação" />
          <MetricaEscura
            rotulo="Gasto em promoções"
            valor={painel.totalGasto ? `−${fmt(painel.totalGasto)}` : "0"}
            nota="debitado do saldo"
          />
          <MetricaEscura
            rotulo="Melhor mês"
            valor={painel.melhorMes ? fmt(painel.melhorMes.total) : "—"}
            nota={painel.melhorMes ? rotuloMes(painel.melhorMes.mes) : "sem histórico"}
          />
        </div>
      </div>

      <div className="grade-2" style={{ marginTop: 16 }}>
        <BlocoCheckpoint
          proximoCheckpoint={painel.proximoCheckpoint}
          projetadoNoCheckpoint={painel.projetadoNoCheckpoint}
          custoProximaTransicao={painel.custoProximaTransicao}
          mesesAtePromocao={painel.mesesAtePromocao}
          checkpointProvavel={painel.checkpointProvavel}
          saldoSuficiente={painel.aptoPorSaldo}
        />
        <RankingMes mes={mes} podio={podio} minhaPosicao={minhaPosicao} />
      </div>

      {/* Histórico */}
      <Card style={{ marginTop: 16 }}>
        <div className="coins-cab">
          <div className="card-t" style={{ marginTop: 0 }}>
            Histórico mensal de coins
          </div>
          <div className="legenda">
            <span>
              <i style={{ ["--c" as string]: "var(--ink)" }} />
              Base recorrente
            </span>
            <span>
              <i style={{ ["--c" as string]: "var(--accent)" }} />
              Bônus
            </span>
          </div>
        </div>

        {historico.length === 0 ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
            Nenhum mês fechado ainda. Registre a primeira apuração em Lançar mês e feche-a.
          </p>
        ) : (
          <div style={{ marginTop: 14 }}>
            <GraficoHistorico historico={historico} />
          </div>
        )}
      </Card>

      {/* Detalhamento do mês */}
      <div className="coins-cab" style={{ marginTop: 48 }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          Detalhamento do mês
          {detalheMes.status === "sem-apuracao" && <span className="chip chip-acento">sem lançamento</span>}
        </h2>
        <SeletorMes meses={meses} mesAtual={mes} rotulo="Mês" />
      </div>

      <section
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 18 }}
      >
        <Card>
          <div className="rotulo">Base recorrente do mês</div>
          <div className="resumo-num">
            {fmt(recorrenteMes)}
            <span style={{ fontSize: 14, color: "var(--muted)", letterSpacing: 0, marginLeft: 6 }}>
              de {fmt(BASE_MENSAL)}
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <Barra pct={pctBaseMes} />
          </div>
          <div className="resumo-nota" style={{ marginTop: 8 }}>
            {recorrenteMes >= BASE_MENSAL
              ? "Base mensal completa."
              : `Faltam ${fmt(BASE_MENSAL - recorrenteMes)} coins (${Math.round(100 - pctBaseMes)}%) para a base cheia.`}
          </div>
          {bonusMes > 0 && (
            <div className="resumo-nota" style={{ color: "var(--accent-ink)" }}>
              +{fmt(bonusMes)} em bônus, fora do teto.
            </div>
          )}

          {detalheMes.foiReaberta && (
            <div className="aviso aviso-atencao" style={{ marginTop: 14, fontSize: 12 }}>
              Este mês foi reaberto e ajustado pela diretoria depois do fechamento original (§9).
            </div>
          )}

          {requisitoDescricao && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line-soft)", paddingTop: 16 }}>
              <div className="rotulo">Requisito além do saldo</div>
              <div style={{ marginTop: 10 }}>
                <RequisitoMacroToggle
                  assessorId={id}
                  nivel={painel.nivelAtual}
                  descricao={requisitoDescricao}
                  atendido={painel.requisitoMacroAtendido}
                />
              </div>
            </div>
          )}
        </Card>

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div className="rolagem-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Meta</th>
                  <th>Valor</th>
                  <th style={{ textAlign: "right" }}>Coins</th>
                </tr>
              </thead>
              <tbody>
                {METAS.map((m) => {
                  const d = detalheMes.porMeta[m.codigo];
                  return (
                    <tr key={m.codigo}>
                      <td>
                        <span className="muted">{m.codigo}</span> {m.nome}
                      </td>
                      <td>{d?.valor === undefined ? "—" : m.tipo === "percentual" ? `${d.valor}%` : d.valor}</td>
                      <td style={{ textAlign: "right", fontWeight: 500 }}>
                        {d?.coins ? `+${fmt(d.coins)}` : "0"}
                        {m.teto && <span className="muted" style={{ fontWeight: 400 }}> / {fmt(m.teto)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
