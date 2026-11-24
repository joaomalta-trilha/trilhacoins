import type { PosicaoRanking } from "@/lib/trilhacoins";
import { Card, fmtPct, rotuloMes } from "./ui";

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
    <Card>
      <div className="card-t" style={{ marginTop: 0 }}>
        Ranking de {rotuloMes(mes)}
        <small>Percentual da base recorrente batido no mês</small>
      </div>

      {podio.length === 0 ? (
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
          Nenhum lançamento nesse mês ainda.
        </p>
      ) : (
        <div className="podio">
          {podio.map((p) => (
            <div key={p.assessorId} className="podio-item">
              <span className="podio-pos">{p.posicao}º</span>
              <span>
                <b>{p.nome}</b>
                <span>{fmtPct(p.pctBase)}% da base</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {minhaPosicao && !noPodio && (
        <p style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line-soft)", fontSize: 13 }}>
          {minhaPosicao.nome} está em <strong>{minhaPosicao.posicao}º lugar</strong> este mês, com{" "}
          {fmtPct(minhaPosicao.pctBase)}% da base.
        </p>
      )}
    </Card>
  );
}
