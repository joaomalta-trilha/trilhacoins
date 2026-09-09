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
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {mostrarSeletor ? (
          <SeletorAssessor assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))} selecionadoId={id} />
        ) : (
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--texto-forte)", letterSpacing: "-0.02em" }}>
            {painel.nome}
          </div>
        )}
        <span style={{ color: "var(--texto-suave)", fontSize: 13 }}>{painel.nivelAtual}</span>
      </div>

      {/* Panorama */}
      <Card escuro style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 300px" }}>
            <div className="rotulo" style={{ color: "var(--trilha-verde-nevoa)" }}>
              Saldo acumulado
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 54, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {fmt(painel.saldo)}
              </span>
              <span style={{ color: "var(--trilha-verde-nevoa)", fontSize: 14 }}>coins</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--trilha-verde-nevoa)", marginTop: 8 }}>
              {painel.custoProximaTransicao !== null ? (
                painel.faltaCoins > 0 ? (
                  <>
                    Faltam <strong style={{ color: "var(--acento)" }}>{fmt(painel.faltaCoins)} coins</strong> para{" "}
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
            </div>
          </div>

          {painel.custoProximaTransicao !== null && (
            <AnelProgresso pct={painel.pctNivel} apto={painel.aptoPorSaldo} />
          )}
        </div>

        <div style={{ marginTop: 22 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--trilha-verde-nevoa)",
              marginBottom: 6,
            }}
          >
            <span>{painel.nivelAtual}</span>
            <span>
              {painel.proximoNivel ?? "—"}
              {painel.custoProximaTransicao ? ` · ${fmt(painel.custoProximaTransicao)} coins` : ""}
            </span>
          </div>
          <Barra pct={painel.pctNivel} alta cor={painel.aptoPorSaldo ? "var(--trilha-verde-confirmacao)" : undefined} />
          {painel.mesesAtePromocao && (
            <div style={{ fontSize: 12, color: "var(--trilha-verde-nevoa)", marginTop: 8 }}>
              Batendo 100% da base: {painel.mesesAtePromocao} {painel.mesesAtePromocao === 1 ? "mês" : "meses"}.
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            marginTop: 24,
            borderTop: "1px solid #333833",
          }}
        >
          <MetricaEscura rotulo="Média mensal" valor={fmt(painel.mediaMensal)} nota="últimos 3 meses" />
          <MetricaEscura rotulo="Aproveitamento" valor={`${Math.round(painel.aproveitamento)}%`} nota="da base recorrente" />
          <MetricaEscura rotulo="Total já ganho" valor={fmt(painel.totalGanho)} nota={`${historico.length} ${historico.length === 1 ? "mês lançado" : "meses lançados"}`} />
          <MetricaEscura rotulo="Bônus acumulado" valor={fmt(painel.bonusAcumulado)} nota="upsell, indicação, certificação" />
          <MetricaEscura rotulo="Gasto em promoções" valor={painel.totalGasto ? `−${fmt(painel.totalGasto)}` : "0"} nota="debitado do saldo" />
          <MetricaEscura
            rotulo="Melhor mês"
            valor={painel.melhorMes ? fmt(painel.melhorMes.total) : "—"}
            nota={painel.melhorMes ? rotuloMes(painel.melhorMes.mes) : "sem histórico"}
          />
        </div>
      </Card>

      <BlocoCheckpoint
        proximoCheckpoint={painel.proximoCheckpoint}
        projetadoNoCheckpoint={painel.projetadoNoCheckpoint}
        custoProximaTransicao={painel.custoProximaTransicao}
        mesesAtePromocao={painel.mesesAtePromocao}
        checkpointProvavel={painel.checkpointProvavel}
        saldoSuficiente={painel.aptoPorSaldo}
      />

      {/* Histórico */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div className="rotulo">Histórico mensal de coins</div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--texto-suave)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: "var(--acento)", display: "inline-block" }} />
              Base recorrente
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, background: "var(--trilha-verde-profundo)", display: "inline-block" }} />
              Bônus
            </span>
          </div>
        </div>

        {historico.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: 14 }}>
            Nenhum mês fechado ainda. Registre a primeira apuração em &quot;Lançar mês&quot; e feche-a.
          </p>
        ) : (
          <div style={{ marginTop: 10 }}>
            <GraficoHistorico historico={historico} />
          </div>
        )}
      </Card>

      {/* Detalhamento do mês */}
      <div
        style={{
          marginTop: 26,
          borderTop: "1px solid var(--borda)",
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
          Detalhamento do mês
          {detalheMes.status === "sem-apuracao" && (
            <span style={{ color: "var(--acento)", fontSize: 13, fontWeight: 400 }}>sem lançamento</span>
          )}
        </h3>
        <SeletorMes meses={meses} mesAtual={mes} rotulo="Mês" />
      </div>

      <section
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}
      >
        <Card>
          <div className="rotulo">Base recorrente do mês</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(recorrenteMes)}</span>
            <span style={{ color: "var(--texto-suave)", fontSize: 14 }}>/ {fmt(BASE_MENSAL)}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Barra pct={pctBaseMes} />
          </div>
          <div style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 6 }}>
            {recorrenteMes >= BASE_MENSAL
              ? "Base mensal completa."
              : `Faltam ${fmt(BASE_MENSAL - recorrenteMes)} coins (${Math.round(100 - pctBaseMes)}%) para a base cheia.`}
          </div>
          {bonusMes > 0 && (
            <div style={{ fontSize: 12, color: "var(--acento)", marginTop: 4 }}>
              +{fmt(bonusMes)} em bônus, fora do teto.
            </div>
          )}

          {detalheMes.foiReaberta && (
            <div className="aviso aviso-atencao" style={{ marginTop: 12, fontSize: 12 }}>
              Este mês foi reaberto e ajustado pela diretoria depois do fechamento original (§9).
            </div>
          )}

          {requisitoDescricao && (
            <div style={{ marginTop: 16, borderTop: "1px solid var(--borda)", paddingTop: 14 }}>
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
          <div style={{ overflowX: "auto" }}>
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
                        <span style={{ opacity: 0.5 }}>{m.codigo}</span> {m.nome}
                      </td>
                      <td>
                        {d?.valor === undefined
                          ? "—"
                          : m.tipo === "percentual"
                            ? `${d.valor}%`
                            : d.valor}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {d?.coins ? `+${fmt(d.coins)}` : "0"}
                        {m.teto && (
                          <span style={{ color: "var(--texto-suave)", fontWeight: 400 }}> / {fmt(m.teto)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <RankingMes mes={mes} podio={podio} minhaPosicao={minhaPosicao} />
    </>
  );
}
