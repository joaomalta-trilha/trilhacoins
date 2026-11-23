"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { normalizarNome } from "@/lib/hub/texto";
import { Chip, Estrelas } from "./basicos";

export interface CartaoCliente {
  slug: string;
  nome: string;
  frase: string | null;
  pacote: string | null;
  status: string;
  pts: number | null;
  pedeAtencao: boolean;
  piloto: boolean;
  temDossie: boolean;
  abertoATodos: boolean;
}

export interface GrupoClientes {
  chave: string;
  titulo: string;
  subtitulo?: string;
  /** resumo da carteira (pontos × teto), já calculado no servidor */
  carteira?: { pts: number; teto: number | null; pct: number | null; situacao: string; nivel: string | null };
  clientes: CartaoCliente[];
}

const ROTULO_SITUACAO: Record<string, string> = {
  equilibrada: "Carteira equilibrada",
  "quase-completa": "Carteira quase completa",
  completa: "Carteira completa",
  "sem-nivel": "Nível a definir",
};

export function ListaClientes({ grupos, mostrarGestao }: { grupos: GrupoClientes[]; mostrarGestao: boolean }) {
  const [busca, setBusca] = useState("");
  const termo = normalizarNome(busca);

  const filtrados = useMemo(
    () =>
      grupos
        .map((g) => ({ ...g, clientes: termo ? g.clientes.filter((c) => normalizarNome(c.nome).includes(termo)) : g.clientes }))
        .filter((g) => g.clientes.length > 0),
    [grupos, termo]
  );

  return (
    <div className="lista-clientes">
      <label className="busca">
        <Search size={16} strokeWidth={1.6} aria-hidden="true" />
        <input
          type="search"
          placeholder="Buscar cliente"
          aria-label="Buscar cliente"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </label>

      {filtrados.length === 0 && <p className="muted">Nenhum cliente encontrado.</p>}

      {filtrados.map((g) => (
        <section key={g.chave} className="grupo-clientes">
          <div className="grupo-topo">
            <div>
              <h2>{g.titulo}</h2>
              {g.subtitulo && <p className="muted pequeno">{g.subtitulo}</p>}
            </div>
            {g.carteira && (
              <div className={`carteira-medidor sit-${g.carteira.situacao}`} title={ROTULO_SITUACAO[g.carteira.situacao]}>
                <div className="carteira-numeros">
                  <b>{g.carteira.pts}</b>
                  <span>{g.carteira.teto ? `de ${g.carteira.teto} pts` : "pts de exigência"}</span>
                </div>
                {g.carteira.teto && (
                  <div className="barra-track">
                    <div className="barra-preenchimento" style={{ width: `${Math.min(100, g.carteira.pct ?? 0)}%` }} />
                  </div>
                )}
                <span className="carteira-situacao">
                  {ROTULO_SITUACAO[g.carteira.situacao]}
                  {g.carteira.nivel ? ` · ${g.carteira.nivel}` : ""}
                </span>
              </div>
            )}
          </div>
          <div className="grade-cartoes">
            {g.clientes.map((c) => (
              <Link key={c.slug} href={`/clientes/${c.slug}`} className={`card cartao-cliente${c.pedeAtencao ? " atencao" : ""}`}>
                <div className="cartao-topo">
                  <b>{c.nome}</b>
                  <Estrelas pts={c.pts} />
                </div>
                <p>{c.frase || (c.temDossie ? "Objetivo a confirmar." : "Dossiê ainda não respondido pela coordenação.")}</p>
                <div className="chips">
                  {c.pacote && <Chip>{c.pacote.replace(/\s*\+\s*Audiovisual/i, "")}</Chip>}
                  {/audiovisual/i.test(c.pacote ?? "") && <Chip>🎥 Audiovisual</Chip>}
                  {c.pedeAtencao && <Chip tom="acento">Pede atenção</Chip>}
                  {c.piloto && <Chip tom="atencao">Piloto do Claudinho</Chip>}
                  {!c.temDossie && <Chip tom="atencao">Dossiê pendente</Chip>}
                  {c.status !== "ativo" && <Chip tom="escuro">{c.status === "pausado" ? "Pausado" : "Saiu"}</Chip>}
                  {mostrarGestao && c.abertoATodos && <Chip tom="ok">Aberto a todos</Chip>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
