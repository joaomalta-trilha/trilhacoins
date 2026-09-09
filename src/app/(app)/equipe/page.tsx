import Link from "next/link";
import { BASE_MENSAL, ehCheckpoint, mesAtualChave } from "@/lib/trilhacoins";
import { exigirGestao } from "@/lib/auth/sessao";
import {
  listarMesesRecentes,
  listarPaineisEquipe,
  mesReferenciaPadrao,
  obterResumoMesEquipe,
  statusDoMes,
} from "@/lib/data/repo";
import { Barra, Card, Resumo, Tag, fmt, fmtPct, rotuloMes } from "@/components/ui";
import { SeletorMes } from "@/components/seletor-mes";
import { SituacaoPromocao } from "@/components/situacao-promocao";

export default async function EquipePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await exigirGestao();
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? mesReferenciaPadrao();

  const hoje = new Date();
  const mesCorrenteReal = mesAtualChave(hoje);
  const ehCheckpointAgora = ehCheckpoint(mesCorrenteReal);

  const [paineis, resumoMes, status] = await Promise.all([
    listarPaineisEquipe(hoje),
    obterResumoMesEquipe(mes),
    statusDoMes(mes),
  ]);

  const meses = listarMesesRecentes(14, hoje);
  const proximoCheckpointReal = paineis[0]?.proximoCheckpoint ?? mesCorrenteReal;
  const aptos = paineis.filter((p) => p.aptoPorSaldo);
  const ranking = [...paineis].sort((a, b) => b.pctNivel - a.pctNivel);

  const lancados = resumoMes.filter((r) => r.lancado).length;
  const totalMesEquipe = resumoMes.reduce((s, r) => s + r.totalMes, 0);

  const badgeStatus =
    status === "fechada" ? "Fechado" : status === "sem-apuracao" ? "Sem apuração" : "Aberto";
  const badgeCor = status === "fechada" ? "var(--trilha-verde-profundo)" : "var(--acento)";

  return (
    <>
      {status === "sem-apuracao" && ehCheckpoint(mes) && (
        <div className="aviso aviso-atencao" style={{ marginBottom: 14 }}>
          {rotuloMes(mes)} é mês de checkpoint e ainda não tem nenhuma apuração lançada. Mês sem
          lançamento não é o mesmo que mês com zero coins — vale conferir antes que passe o
          checkpoint (§9 do briefing).
        </div>
      )}

      <section
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}
      >
        <Resumo
          titulo="Prontos por saldo"
          valor={`${aptos.length}/${paineis.length}`}
          nota="saldo já cobre a próxima transição"
          destaque={aptos.length > 0}
        />
        <Resumo
          titulo="Próximo checkpoint"
          valor={rotuloMes(proximoCheckpointReal)}
          nota="quando as promoções são efetivadas"
        />
      </section>

      <Card style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tabela" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Assessor</th>
                <th>Nível atual</th>
                <th>Próximo nível</th>
                <th style={{ textAlign: "right" }}>Saldo</th>
                <th style={{ textAlign: "right" }}>Meta</th>
                <th style={{ width: 190 }}>Progresso</th>
                <th>Promoção possível</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((p) => (
                <tr key={p.assessorId}>
                  <td>
                    <Link href={`/assessor/${p.assessorId}`} className="btn-link">
                      {p.nome}
                    </Link>
                  </td>
                  <td style={{ color: "var(--texto-suave)" }}>{p.nivelAtual}</td>
                  <td>{p.proximoNivel ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(p.saldo)}</td>
                  <td style={{ textAlign: "right", color: "var(--texto-suave)" }}>
                    {p.custoProximaTransicao ? fmt(p.custoProximaTransicao) : "—"}
                  </td>
                  <td>
                    {p.custoProximaTransicao ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <Barra
                              pct={p.pctNivel}
                              cor={p.aptoPorSaldo ? "var(--trilha-verde-confirmacao)" : undefined}
                            />
                          </div>
                          <span style={{ fontWeight: 600, minWidth: 38, textAlign: "right" }}>
                            {fmtPct(p.pctNivel)}%
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 3 }}>
                          {p.faltaCoins > 0 ? `faltam ${fmt(p.faltaCoins)} coins` : "saldo suficiente"}
                        </div>
                      </>
                    ) : (
                      <span style={{ color: "var(--texto-suave)" }}>nível máximo</span>
                    )}
                  </td>
                  <td>
                    <SituacaoPromocao
                      assessorId={p.assessorId}
                      custoProximaTransicao={p.custoProximaTransicao}
                      aptoPorSaldo={p.aptoPorSaldo}
                      aptoParaPromover={p.aptoParaPromover}
                      requisitoMacro={p.requisitoMacro}
                      ehCheckpointAgora={ehCheckpointAgora}
                      proximoCheckpointReal={proximoCheckpointReal}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 8, maxWidth: 760 }}>
        A data de promoção assume 100% da base recorrente (1.300 coins/mês), sem bônus, e conta o
        mês corrente ainda aberto. Upsell, indicação e certificação antecipam o checkpoint.
      </p>

      <div
        style={{
          marginTop: 30,
          borderTop: "1px solid var(--borda)",
          paddingTop: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ fontSize: 17, display: "flex", alignItems: "center", gap: 10 }}>
            Apuração de {rotuloMes(mes)}
            <Tag texto={badgeStatus} cor={badgeCor} />
          </h3>
          <div style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 3 }}>
            {lancados}/{resumoMes.length} assessores lançados · {fmt(totalMesEquipe)} coins gerados
            de um teto recorrente de {fmt(BASE_MENSAL * resumoMes.length)}
          </div>
        </div>
        <SeletorMes meses={meses} mesAtual={mes} />
      </div>

      <Card style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tabela" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Assessor</th>
                <th style={{ width: 240 }}>Base do mês (teto 1.300)</th>
                <th style={{ textAlign: "right" }}>Bônus</th>
                <th style={{ textAlign: "right" }}>Total do mês</th>
                <th>Situação no checkpoint</th>
              </tr>
            </thead>
            <tbody>
              {resumoMes.map((r) => {
                const painel = paineis.find((p) => p.assessorId === r.assessorId);
                return (
                  <tr key={r.assessorId}>
                    <td>
                      <Link href={`/assessor/${r.assessorId}`} className="btn-link">
                        {r.nome}
                      </Link>
                      <div style={{ fontSize: 11, color: "var(--texto-suave)" }}>{r.nivel}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <Barra pct={r.pctBase} />
                        </div>
                        <span style={{ minWidth: 78, textAlign: "right" }}>
                          {fmt(r.coinsRecorrente)}{" "}
                          <span style={{ color: "var(--texto-suave)" }}>
                            · {Math.round(r.pctBase)}%
                          </span>
                        </span>
                      </div>
                      {!r.lancado && (
                        <span style={{ fontSize: 11, color: "var(--acento)" }}>sem lançamento</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>{r.coinsBonus ? `+${fmt(r.coinsBonus)}` : "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(r.totalMes)}</td>
                    <td>
                      {painel && (
                        <SituacaoPromocao
                          assessorId={painel.assessorId}
                          custoProximaTransicao={painel.custoProximaTransicao}
                          aptoPorSaldo={painel.aptoPorSaldo}
                          aptoParaPromover={painel.aptoParaPromover}
                          requisitoMacro={painel.requisitoMacro}
                          ehCheckpointAgora={ehCheckpointAgora}
                          proximoCheckpointReal={proximoCheckpointReal}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
