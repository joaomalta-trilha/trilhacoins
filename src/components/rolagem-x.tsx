"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * Caixa com rolagem para o lado (tabelas largas). Enquanto há colunas
 * escondidas à direita, a borda esmaece, como no painel Saúde, para
 * ninguém achar que a tabela acabou ali.
 */
export function RolagemX({ children }: { children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [temMais, setTemMais] = useState(false);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setTemMais(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      obs.disconnect();
    };
  }, []);

  return (
    <div className={`rolagem-borda${temMais ? " tem-mais" : ""}`}>
      <div ref={caixa} className="rolagem-x">
        {children}
      </div>
    </div>
  );
}
