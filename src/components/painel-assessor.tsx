import { BASE_MENSAL, ehCheckpoint } from "@/lib/trilhacoins";
import { fmt, rotuloMes } from "./ui";

export function AnelProgresso({ pct, apto }: { pct: number; apto: boolean }) {
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  const p = Math.max(0, Math.min(100, pct));
  const preenchido = (p / 100) * circunferencia;
  return (
    <svg width={120} height={120} viewBox="0 0 100 100" style={{ flexShrink: 0 }} role="img" aria-label={`${Math.round(p)}% do caminho`}>
      <circle cx={50} cy={50} r={raio} fill="none" stroke="#2e2e2b" strokeWidth={6} />
      <circle
        cx={50}
        cy={50}
        r={raio}
        fill="none"
        stroke={apto ? "var(--ok)" : "var(--accent)"}
        strokeWidth={6}
        strokeDasharray={`${preenchido} ${circunferencia}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x={50}
        y={50}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={22}
        fontFamily="var(--fonte)"
        letterSpacing="-0.5"
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}

export function MetricaEscura({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="metrica-escura">
      <span>{rotulo}</span>
      <b>{valor}</b>
      <small>{nota}</small>
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
      <line x1={margem} y1={yTeto} x2={largura - margem} y2={yTeto} stroke="var(--line)" strokeDasharray="4 4" strokeWidth={1} />
      <text x={largura - margem} y={yTeto - 5} textAnchor="end" fontSize={10} fill="var(--muted)">
        base 1.300
      </text>
      {historico.map((h, i) => {
        const x = margem + i * larguraBarra + larguraBarra * 0.22;
        const w = larguraBarra * 0.56;
        const hRec = escala(h.coinsRecorrente);
        const hBon = escala(h.coinsBonus);
        return (
          <g key={h.mes}>
            <rect x={x} y={yBase - hRec} width={w} height={hRec} rx={3} fill="var(--ink)" />
            {hBon > 0 && <rect x={x} y={yBase - hRec - hBon - 2} width={w} height={hBon} rx={3} fill="var(--accent)" />}
            <text
              x={x + w / 2}
              y={altura + 12}
              textAnchor="middle"
              fontSize={10}
              fill={ehCheckpoint(h.mes) ? "var(--accent-ink)" : "var(--muted)"}
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
      <div className="card">
        <div className="card-t" style={{ marginTop: 0 }}>
          Checkpoint
          <small>Nível máximo da trilha: não há próxima transição a projetar.</small>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="rotulo">Próximo checkpoint</div>
          <div className="resumo-num">{rotuloMes(proximoCheckpoint)}</div>
        </div>
        <div>
          <div className="rotulo">Projeção a 100% no checkpoint</div>
          <div className="resumo-num">
            {fmt(projetadoNoCheckpoint)}
            <span style={{ fontSize: 13, color: "var(--muted)", letterSpacing: 0, marginLeft: 6 }}>
              de {fmt(custoProximaTransicao)}
            </span>
          </div>
        </div>
      </div>

      <div className={`checkpoint-data${saldoSuficiente ? " ok" : ""}`}>
        <span>Data provável da promoção</span>
        <b>
          {checkpointProvavel ? rotuloMes(checkpointProvavel) : "—"}
          {mesesAtePromocao !== null && (
            <small>
              {mesesAtePromocao} {mesesAtePromocao === 1 ? "mês" : "meses"} a 100% da base
            </small>
          )}
        </b>
      </div>
    </div>
  );
}
