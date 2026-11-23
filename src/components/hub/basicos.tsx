import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { estrelasDaExigencia } from "@/lib/hub/exigencia";

const ESTRELA = "M8 1.3l2.05 4.2 4.6.68-3.33 3.25.79 4.6L8 11.86l-4.11 2.17.79-4.6L1.35 6.18l4.6-.68z";

/** Nota de exigência em estrelas (1 a 5). Sem nota → nada. */
export function Estrelas({ pts, comPontos = false }: { pts: number | null; comPontos?: boolean }) {
  const n = estrelasDaExigencia(pts);
  if (!n) return null;
  return (
    <span className="estrelas" role="img" aria-label={`${n} de 5 estrelas, ${pts} pontos de exigência`} title={`${pts} pontos de exigência`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 16 16" aria-hidden="true" className={i < n ? undefined : "apagada"}>
          <path d={ESTRELA} fill="currentColor" />
        </svg>
      ))}
      {comPontos && <span className="estrelas-pts">{pts} pts</span>}
    </span>
  );
}

export function Chip({ children, tom }: { children: ReactNode; tom?: "acento" | "ok" | "atencao" | "escuro" }) {
  return <span className={`chip${tom ? ` chip-${tom}` : ""}`}>{children}</span>;
}

export function PaginaTopo({
  rotulo,
  titulo,
  lede,
  children,
}: {
  rotulo?: string;
  titulo: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="pagina-topo">
      {rotulo && <p className="rotulo">{rotulo}</p>}
      <h1>{titulo}</h1>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </header>
  );
}

/** Aviso amigável quando o banco ainda não recebeu a migration do Hub. */
export function AvisoMigracao() {
  return (
    <div className="card aviso-migracao">
      <Info size={18} strokeWidth={1.6} aria-hidden="true" />
      <div>
        <strong>O banco ainda não tem as tabelas do Hub.</strong>
        <p>
          Rode <code>supabase/migrations/0007_hub_fundacao.sql</code> no SQL Editor do Supabase e depois os arquivos de
          importação em <code>data/seed/</code>. O passo a passo está no README.
        </p>
      </div>
    </div>
  );
}

export function EmBreve({ titulo, fase, children }: { titulo: string; fase: string; children: ReactNode }) {
  return (
    <div className="card em-breve-card">
      <div className="em-breve-topo">
        <span className="rotulo">{titulo}</span>
        <Chip>{fase}</Chip>
      </div>
      <p>{children}</p>
    </div>
  );
}
