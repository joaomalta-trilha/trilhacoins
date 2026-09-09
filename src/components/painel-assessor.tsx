import { BASE_MENSAL, ehCheckpoint } from "@/lib/trilhacoins";
import { fmt, rotuloMes } from "./ui";

export function AnelProgresso({ pct, apto }: { pct: number; apto: boolean }) {
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  const p = Math.max(0, Math.min(100, pct));
  const preenchido = (p / 100) * circunferencia;
  return (
    <svg width={104} height={104} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <circle cx={50} cy={50} r={raio} fill="none" stroke="#333833" strokeWidth={8} />
      <circle
        cx={50}
        cy={50}
        r={raio}
        fill="none"
        stroke={apto ? "var(--trilha-verde-confirmacao)" : "var(--acento)"}
        strokeWidth={8}
        strokeDasharray={`${preenchido} ${circunferencia}`}
        strokeLinecap="butt"
        transform="rotate(-90 50 50)"
      />
      <text
        x={50}
        y={50}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#E9E8E4"
        fontSize={20}
        fontWeight={700}
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}

export function MetricaEscura({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div style={{ padding: "14px 18px 14px 0", minWidth: 140 }}>
      <div
        style={{
          fontFamily: "var(--fonte-wide)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--trilha-verde-salvia)",
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 4 }}>{valor}</div>
      <div style={{ fontSize: 11, color: "var(--trilha-verde-nevoa)", marginTop: 2 }}>{nota}</div>
    </div>
  );
}

export function GraficoHistorico({
  historico,
}: {
  historico: { mes: string; coinsRecorrente: number; coinsBonus: number }[];
}) {
  const largura = 700;
  const altura = 170;
  const margemBaixo = 22;
  const margem = 6;
  const maxHist = Math.max(BASE_MENSAL, ...historico.map((h) => h.coinsRecorrente + h.coinsBonus), 1);
  const escala = (v: number) => (v / maxHist) * (altura - margemBaixo);
  const larguraBarra = (largura - margem * 2) / historico.length;
  const yBase = altura - margemBaixo;
  const yTeto = yBase - escala(BASE_MENSAL);

  return (
    <svg viewBox={`0 0 ${largura} ${altura + 16}`} width="100%" role="img" aria-label="Histórico mensal de coins">
      <line
        x1={margem}
        y1={yTeto}
        x2={largura - margem}
        y2={yTeto}
        stroke="var(--trilha-verde-nevoa)"
        strokeDasharray="4 4"
        strokeWidth={1}
      />
      <text x={largura - margem} y={yTeto - 4} textAnchor="end" fontSize={10} fill="var(--texto-suave)">
        1.300
      </text>
      {historico.map((h, i) => {
        const x = margem + i * larguraBarra + larguraBarra * 0.18;
        const w = larguraBarra * 0.64;
        const hRec = escala(h.coinsRecorrente);
        const hBon = escala(h.coinsBonus);
        return (
          <g key={h.mes}>
            <rect x={x} y={yBase - hRec} width={w} height={hRec} fill="var(--acento)" />
            <rect x={x} y={yBase - hRec - hBon} width={w} height={hBon} fill="var(--trilha-verde-profundo)" />
            <text
              x={x + w / 2}
              y={altura + 12}
              textAnchor="middle"
              fontSize={10}
              fill={ehCheckpoint(h.mes) ? "var(--acento)" : "var(--texto-suave)"}
            >
              {rotuloMes(h.mes)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BlocoCheckpoint({
  proximoCheckpoint,
  projetadoNoCheckpoint,
  custoProximaTransicao,
  mesesAtePromocao,
  checkpointProvavel,
  saldoSuficiente,
}: {
  proximoCheckpoint: string;
  projetadoNoCheckpoint: number;
  custoProximaTransicao: number | null;
  mesesAtePromocao: number | null;
  checkpointProvavel: string | null;
  saldoSuficiente: boolean;
}) {
  if (custoProximaTransicao === null) {
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <div className="rotulo">Checkpoint</div>
        <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: 8 }}>
          Nível máximo da trilha — não há próxima transição a projetar.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="rotulo">Próximo checkpoint</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{rotuloMes(proximoCheckpoint)}</div>
        </div>
        <div>
          <div className="rotulo">Projeção a 100% no checkpoint</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {fmt(projetadoNoCheckpoint)}{" "}
            <span style={{ fontSize: 13, color: "var(--texto-suave)", fontWeight: 400 }}>
              / {fmt(custoProximaTransicao)}
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: "14px 16px",
          borderRadius: 6,
          background: saldoSuficiente ? "var(--trilha-verde-confirmacao)" : "var(--trilha-preto)",
          color: saldoSuficiente ? "var(--trilha-preto)" : "var(--trilha-bege)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          Data provável da promoção
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>
          {checkpointProvavel ? rotuloMes(checkpointProvavel) : "—"}
          {mesesAtePromocao !== null && (
            <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 10 }}>
              ({mesesAtePromocao} {mesesAtePromocao === 1 ? "mês" : "meses"} a 100% da base)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
