"use client";

import { useEffect, useRef, useState } from "react";

/** Linha de leitura: logo abaixo das pílulas presas no topo. */
const LINHA = 150;

/**
 * Pílulas presas no topo que levam às partes de uma página longa (o
 * dossiê) e acendem a parte que está sendo lida. No celular a fileira
 * rola para o lado: a borda esmaece enquanto há mais pílulas escondidas.
 */
export function Ancoras({ itens }: { itens: { id: string; rotulo: string }[] }) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const [borda, setBorda] = useState({ antes: false, depois: false });
  const fileira = useRef<HTMLElement>(null);

  // qual parte está sendo lida
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

  // há pílulas escondidas para algum dos lados?
  useEffect(() => {
    const el = fileira.current;
    if (!el) return;
    const medir = () =>
      setBorda({
        antes: el.scrollLeft > 2,
        depois: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      obs.disconnect();
    };
  }, []);

  // a pílula da parte lida fica sempre à vista na fileira
  useEffect(() => {
    const el = fileira.current;
    const pilula = el?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!el || !pilula) return;
    const fora = pilula.offsetLeft < el.scrollLeft || pilula.offsetLeft + pilula.offsetWidth > el.scrollLeft + el.clientWidth;
    if (fora) el.scrollTo({ left: Math.max(0, pilula.offsetLeft - 24), behavior: "smooth" });
  }, [ativo]);

  return (
    <div className="ancoras-trilho wrap">
      <div className={`ancoras-caixa${borda.antes ? " tem-antes" : ""}${borda.depois ? " tem-depois" : ""}`}>
        <nav ref={fileira} className="ancoras" aria-label="Partes do dossiê">
          {itens.map((i) => (
            <a key={i.id} href={`#${i.id}`} aria-current={ativo === i.id ? "true" : undefined}>
              {i.rotulo}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
