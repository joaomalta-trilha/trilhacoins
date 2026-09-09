import type { ReactNode } from "react";

export function Card({
  children,
  escuro,
  style,
}: {
  children: ReactNode;
  escuro?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={escuro ? "card-escuro" : "card"} style={style}>
      {children}
    </div>
  );
}

export function Rotulo({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="rotulo" style={style}>
      {children}
    </div>
  );
}

export function Barra({
  pct,
  cor,
  alta,
}: {
  pct: number;
  cor?: string;
  alta?: boolean;
}) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div className={`barra-track${alta ? " alta" : ""}`}>
      <div className="barra-preenchimento" style={{ width: `${p}%`, background: cor }} />
    </div>
  );
}

export function Tag({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span className="tag" style={{ color: cor }}>
      {texto}
    </span>
  );
}

export function Resumo({
  titulo,
  valor,
  nota,
  destaque,
}: {
  titulo: string;
  valor: string;
  nota: string;
  destaque?: boolean;
}) {
  return (
    <Card style={{ padding: 16 }}>
      <Rotulo>{titulo}</Rotulo>
      <div
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: destaque ? "var(--acento)" : "var(--texto-forte)",
          marginTop: 6,
          letterSpacing: "-0.02em",
        }}
      >
        {valor}
      </div>
      <div style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 2 }}>{nota}</div>
    </Card>
  );
}

export function fmt(n: number | undefined | null): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));
}

export function fmtPct(n: number, casas = 1): string {
  return n.toFixed(casas).replace(".", ",");
}

const MESES_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function rotuloMes(chave: string): string {
  const [a, m] = chave.split("-");
  return `${MESES_PT[Number(m) - 1]}/${a.slice(2)}`;
}
