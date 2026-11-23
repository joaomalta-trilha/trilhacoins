"use client";

// "use client": o pacote react-markdown importa hooks do React no mesmo
// módulo, e o Next recusa isso num Server Component. Como Client
// Component ele continua sendo renderizado no servidor (SSR).
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Markdown do Hub (dossiês e Trilha do Assessor). react-markdown não
// renderiza HTML cru e filtra esquemas perigosos de URL por padrão;
// links externos abrem em nova aba.

const componentes: Components = {
  a: ({ href, children }) => {
    const externo = /^https?:\/\//i.test(href ?? "");
    return (
      <a href={href} target={externo ? "_blank" : undefined} rel={externo ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  },
  table: ({ children }) => (
    <div className="md-tabela">
      <table>{children}</table>
    </div>
  ),
};

const componentesInline: Components = { ...componentes, p: ({ children }) => <>{children}</> };

export function Md({ texto, className }: { texto: string; className?: string }) {
  return (
    <div className={`md${className ? ` ${className}` : ""}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={componentes}>
        {texto}
      </Markdown>
    </div>
  );
}

/** Para valores curtos dentro de uma linha (negrito, link, código), sem parágrafo em volta. */
export function MdInline({ texto }: { texto: string }) {
  return (
    <span className="md md-inline">
      <Markdown remarkPlugins={[remarkGfm]} components={componentesInline}>
        {texto}
      </Markdown>
    </span>
  );
}
