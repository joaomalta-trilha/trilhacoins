"use client";

import { useEffect, useState } from "react";

/** Linha de leitura: logo abaixo das pílulas presas no topo. */
const LINHA = 150;

/**
 * Pílulas presas no topo que levam às partes de uma página longa (o
 * dossiê) e acendem a parte que está sendo lida.
 */
export function Ancoras({ itens }: { itens: { id: string; rotulo: string }[] }) {
  const [ativo, setAtivo] = useState<string | null>(null);

  useEffect(() => {
    let quadro = 0;
    function medir() {
      quadro = 0;
      let atual: string | null = null;
      for (const i of itens) {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= LINHA) atual = i.id;
      }
      // no fim da página, a última parte pode nunca cruzar a linha
      const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setAtivo(noFim ? (itens[itens.length - 1]?.id ?? atual) : atual);
    }
    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(medir);
    }
    medir();
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", agendar);
    return () => {
      window.removeEventListener("scroll", agendar);
      window.removeEventListener("resize", agendar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, [itens]);

  return (
    <div className="ancoras-trilho wrap">
      <nav className="ancoras" aria-label="Partes do dossiê">
        {itens.map((i) => (
          <a key={i.id} href={`#${i.id}`} aria-current={ativo === i.id ? "true" : undefined}>
            {i.rotulo}
          </a>
        ))}
      </nav>
    </div>
  );
}
