"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { DIAS_UTEIS, type DiaUtil } from "@/lib/hub/dossie";

export interface ClienteRotina {
  slug: string;
  nome: string;
  iniciais: string;
  pedeAtencao: boolean;
  /** itens já resumidos (uma linha cada), por dia útil */
  dias: Record<DiaUtil, string[]>;
}

const CURTO: Record<DiaUtil, string> = {
  Segunda: "Seg",
  Terça: "Ter",
  Quarta: "Qua",
  Quinta: "Qui",
  Sexta: "Sex",
};

/**
 * A rotina da carteira, um dia por vez: abre no dia de hoje e as pílulas
 * deixam espiar o resto da semana sem sair do Início.
 */
export function RotinaDaSemana({ hoje, clientes }: { hoje: DiaUtil | null; clientes: ClienteRotina[] }) {
  const [dia, setDia] = useState<DiaUtil>(hoje ?? "Segunda");
  const doDia = clientes
    .filter((c) => c.dias[dia].length > 0)
    .sort((a, b) => Number(b.pedeAtencao) - Number(a.pedeAtencao) || a.nome.localeCompare(b.nome));
  const titulo = dia === hoje ? "Rotina de hoje" : `Rotina de ${dia.toLowerCase()}`;
  const totalItens = doDia.reduce((s, c) => s + c.dias[dia].length, 0);

  return (
    <section className="secao" id="rotina" aria-labelledby="titulo-rotina">
      <div className="secao-cab">
        <h2 id="titulo-rotina">{titulo}</h2>
        <div className="pills sub-pills" role="group" aria-label="Dia da semana">
          {DIAS_UTEIS.map((d) => (
            <button key={d} type="button" className="pill" aria-pressed={d === dia} onClick={() => setDia(d)}>
              {CURTO[d]}
              {d === hoje && <em className="hoje">hoje</em>}
            </button>
          ))}
        </div>
        {doDia.length > 0 && (
          <p>
            {totalItens} {totalItens === 1 ? "rito" : "ritos"} em {doDia.length}{" "}
            {doDia.length === 1 ? "cliente" : "clientes"}, tirados da rotina de cada dossiê. Quem pede atenção vem
            primeiro.
          </p>
        )}
      </div>

      {clientes.length === 0 ? (
        <div className="vazio">
          <b>Nenhuma rotina escrita ainda</b>
          <p>A rotina de cada cliente vem do dossiê. Quando a coordenação preencher, os ritos de cada dia aparecem aqui.</p>
        </div>
      ) : doDia.length === 0 ? (
        <div className="vazio">
          <b>Sem ritos na {dia.toLowerCase()}</b>
          <p>Nenhum dossiê da carteira marca algo para esse dia. Use as pílulas para ver os outros dias.</p>
        </div>
      ) : (
        <div className="grade-rotina">
          {doDia.map((c) => (
            <Link key={c.slug} href={`/clientes/${c.slug}`} className="card cartao-rotina">
              <div className="card-hd">
                <span className="ic" aria-hidden="true">
                  {c.iniciais}
                  {c.pedeAtencao && <i className="ponto" />}
                </span>
                <span className="go" aria-hidden="true">
                  <ArrowUpRight strokeWidth={1.8} />
                </span>
              </div>
              <div className="card-t">
                {c.nome}
                <small>
                  {c.dias[dia].length} {c.dias[dia].length === 1 ? "rito" : "ritos"}
                  {c.pedeAtencao ? " · pede atenção" : ""}
                </small>
              </div>
              <ul className="ritos">
                {c.dias[dia].map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
