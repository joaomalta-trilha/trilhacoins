import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Info } from "lucide-react";
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

export function Chip({ children, tom }: { children: ReactNode; tom?: "acento" | "ok" | "atencao" | "escuro" | "borda" }) {
  return <span className={`chip${tom ? ` chip-${tom}` : ""}`}>{children}</span>;
}

/** Área clara do topo de cada tela (largura de leitura do Hub). */
export function Cena({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`cena wrap${className ? ` ${className}` : ""}`}>{children}</section>;
}

/** Faixa escura arredondada: o que é foco ou referência fica aqui. */
export function Faixa({ children, meio, id, rotulo }: { children: ReactNode; meio?: boolean; id?: string; rotulo?: string }) {
  return (
    <section className={`faixa${meio ? " meio" : ""}`} id={id} aria-label={rotulo}>
      <div className="wrap">{children}</div>
    </section>
  );
}

/** Topo de tela: título grande e leve, frase de apoio e, opcionalmente, o lado direito. */
export function PaginaTopo({
  titulo,
  lede,
  lado,
  children,
}: {
  titulo: ReactNode;
  lede?: ReactNode;
  /** conteúdo da coluna da direita (cartão, placar) */
  lado?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={`heroi${lado ? "" : " simples"}`}>
      <div>
        <h1>{titulo}</h1>
        {lede && <p className="lede">{lede}</p>}
        {children}
      </div>
      {lado}
    </header>
  );
}

/** Seta em círculo preto (gira ao passar o mouse no link que a contém). */
export function Seta({ claro }: { claro?: boolean }) {
  return (
    <span className={`go${claro ? " claro" : ""}`} aria-hidden="true">
      <ArrowUpRight strokeWidth={1.8} />
    </span>
  );
}

/** Ícone de linha num círculo fino; `ponto` marca algo que pede atenção. */
export function Ic({ children, ponto, contagem }: { children: ReactNode; ponto?: boolean; contagem?: number }) {
  return (
    <span className="ic" aria-hidden="true">
      {children}
      {ponto && <i className="ponto" />}
      {contagem ? <i className="contagem">{contagem}</i> : null}
    </span>
  );
}

/** Link de volta, com o círculo da referência. */
export function Voltar({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="voltar">
      <span className="btn-circulo" aria-hidden="true">
        <ArrowLeft strokeWidth={1.8} />
      </span>
      {children}
    </Link>
  );
}

/** Duas letras para o círculo de um cliente ("Clínica Sol" → "CS"). */
export function iniciais(nome: string): string {
  const palavras = nome
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^\p{N}+$/u.test(p));
  const base = palavras.length ? palavras : nome.split(/\s+/).filter(Boolean);
  const letras = base.length >= 2 ? base[0][0] + base[1][0] : (base[0] ?? "?").slice(0, 2);
  return letras.toUpperCase();
}

/** Aviso amigável quando o banco ainda não recebeu a migration do Hub. */
export function AvisoMigracao() {
  return (
    <div className="aviso aviso-migracao">
      <Info strokeWidth={1.6} aria-hidden="true" />
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
    <div className="em-breve-card">
      <div className="em-breve-topo">
        <b>{titulo}</b>
        <Chip>{fase}</Chip>
      </div>
      <p>{children}</p>
    </div>
  );
}
