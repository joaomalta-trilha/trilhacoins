import type { PosicaoRanking } from "@/lib/trilhacoins";
import { Card, fmtPct, rotuloMes } from "./ui";

const MEDALHA = ["🥇", "🥈", "🥉"];

/**
 * Ranking do mês (§7): pódio nomeado (top 3) + a posição de quem está
 * vendo a página — nunca a lista inteira. Vale pra qualquer papel.
 */
export function RankingMes({
  mes,
  podio,
  minhaPosicao,
}: {
  mes: string;
  podio: PosicaoRanking[];
  minhaPosicao: PosicaoRanking | undefined;
}) {
  const noPodio = minhaPosicao?.nomeado ?? false;

  return (
    <Card style={{ marginTop: 12 }}>
      <div className="rotulo">Ranking de {rotuloMes(mes)} · % da base recorrente</div>

      {podio.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: 10 }}>
          Nenhum lançamento nesse mês ainda.
        </p>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          {podio.map((p) => (
            <div key={p.assessorId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>{MEDALHA[p.posicao - 1]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: "var(--texto-suave)" }}>{fmtPct(p.pctBase)}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {minhaPosicao && !noPodio && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: "1px solid var(--borda)",
            fontSize: 13,
          }}
        >
          {minhaPosicao.nome} está em <strong>{minhaPosicao.posicao}º lugar</strong> este mês, com{" "}
          {fmtPct(minhaPosicao.pctBase)}% da base.
        </div>
      )}
    </Card>
  );
}
