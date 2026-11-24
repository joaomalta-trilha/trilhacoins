"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, Video } from "lucide-react";
import { normalizarNome } from "@/lib/hub/texto";
import { Chip, Estrelas } from "./basicos";

export interface CartaoCliente {
  slug: string;
  nome: string;
  iniciais: string;
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

export type Filtro = "todos" | "atencao" | "sem-dossie" | "sem-assessor" | "pausados";

const ROTULO_SITUACAO: Record<string, string> = {
  equilibrada: "Carteira equilibrada",
  "quase-completa": "Carteira quase completa",
  completa: "Carteira completa",
  "sem-nivel": "Nível a definir",
};

const FILTROS: { valor: Filtro; rotulo: string; so?: "gestao" }[] = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "atencao", rotulo: "Pedem atenção" },
  { valor: "sem-dossie", rotulo: "Sem dossiê" },
  { valor: "sem-assessor", rotulo: "Sem assessor", so: "gestao" },
  { valor: "pausados", rotulo: "Pausados e saíram" },
];

function passa(filtro: Filtro, grupo: GrupoClientes, c: CartaoCliente): boolean {
  switch (filtro) {
    case "atencao":
      return c.pedeAtencao;
    case "sem-dossie":
      return !c.temDossie;
    case "sem-assessor":
      return grupo.chave === "sem-assessor";
    case "pausados":
      return c.status !== "ativo";
    default:
      return true;
  }
}

export function ListaClientes({
  grupos,
  mostrarGestao,
  filtroInicial = "todos",
}: {
  grupos: GrupoClientes[];
  mostrarGestao: boolean;
  filtroInicial?: Filtro;
}) {
  const pathname = usePathname();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);
  const campo = useRef<HTMLInputElement>(null);
  const termo = normalizarNome(busca);

  // "/" leva direto para a busca, como no painel Saúde.
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      e.preventDefault();
      campo.current?.focus();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  function escolher(f: Filtro) {
    setFiltro(f);
    // guarda o filtro no endereço, sem recarregar a página
    window.history.replaceState(null, "", f === "todos" ? pathname : `${pathname}?filtro=${f}`);
  }

  const visiveis = useMemo(() => FILTROS.filter((f) => !f.so || mostrarGestao), [mostrarGestao]);
  const contagem = useMemo(() => {
    const n: Record<Filtro, number> = { todos: 0, atencao: 0, "sem-dossie": 0, "sem-assessor": 0, pausados: 0 };
    for (const g of grupos) for (const c of g.clientes) for (const f of visiveis) if (passa(f.valor, g, c)) n[f.valor]++;
    return n;
  }, [grupos, visiveis]);

  const filtrados = useMemo(
    () =>
      grupos
        .map((g) => ({
          ...g,
          clientes: g.clientes.filter((c) => passa(filtro, g, c) && (!termo || normalizarNome(c.nome).includes(termo))),
        }))
        .filter((g) => g.clientes.length > 0),
    [grupos, termo, filtro]
  );

  return (
    <div className="lista-clientes">
      <div className="ferramentas">
        <label className="busca">
          <Search strokeWidth={1.6} aria-hidden="true" />
          <input
            ref={campo}
            type="search"
            placeholder="Buscar cliente"
            aria-label="Buscar cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="pills sub-pills" role="group" aria-label="Filtrar clientes">
          {visiveis.map((f) => (
            <button key={f.valor} type="button" className="pill" aria-pressed={filtro === f.valor} onClick={() => escolher(f.valor)}>
              {f.rotulo}
              <em>{contagem[f.valor]}</em>
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 && (
        <div className="vazio" style={{ marginTop: 32 }}>
          <b>Nenhum cliente encontrado</b>
          <p>
            {termo ? "Confira o nome digitado" : "Nenhum cliente nesse filtro"}
            {filtro !== "todos" ? " ou volte para Todos." : "."}
          </p>
        </div>
      )}

      {filtrados.map((g) => (
        <section key={g.chave} className="grupo" id={`a-${g.chave}`} aria-labelledby={`t-${g.chave}`}>
          <div className="grupo-cab">
            <div>
              <h2 id={`t-${g.chave}`}>{g.titulo}</h2>
              {g.subtitulo && <p>{g.subtitulo}</p>}
            </div>
            {g.carteira && (
              <div className={`medidor-carteira sit-${g.carteira.situacao}`}>
                <div className="valor">
                  <b>
                    {g.carteira.pts}
                    <small>{g.carteira.teto ? `de ${g.carteira.teto} pts` : "pts de exigência"}</small>
                  </b>
                  {g.carteira.pct !== null && <span>{g.carteira.pct}%</span>}
                </div>
                {g.carteira.teto && (
                  <div className="barra-track">
                    <div className="barra-preenchimento" style={{ width: `${Math.min(100, g.carteira.pct ?? 0)}%` }} />
                  </div>
                )}
                <span>
                  {ROTULO_SITUACAO[g.carteira.situacao]}
                  {g.carteira.nivel ? ` · ${g.carteira.nivel}` : ""}
                </span>
              </div>
            )}
          </div>
          <div className="grade-cartoes">
            {g.clientes.map((c) => {
              const audiovisual = /audiovisual/i.test(c.pacote ?? "");
              const pacote = c.pacote?.replace(/\s*\+\s*Audiovisual/i, "") || null;
              return (
                <Link key={c.slug} href={`/clientes/${c.slug}`} className="card cartao-cliente">
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
                    {pacote && <small>{pacote}</small>}
                  </div>
                  <p className="frase">
                    {c.frase || (c.temDossie ? "Objetivo a confirmar." : "Dossiê ainda não respondido pela coordenação.")}
                  </p>
                  <div className="chips">
                    {c.pts !== null && (
                      <Chip tom="borda">
                        <Estrelas pts={c.pts} />
                      </Chip>
                    )}
                    {c.pedeAtencao && <Chip tom="acento">Pede atenção</Chip>}
                    {audiovisual && (
                      <Chip>
                        <Video strokeWidth={1.6} aria-hidden="true" />
                        Audiovisual
                      </Chip>
                    )}
                    {c.piloto && <Chip tom="atencao">Piloto do Claudinho</Chip>}
                    {!c.temDossie && <Chip tom="atencao">Dossiê pendente</Chip>}
                    {c.status !== "ativo" && <Chip tom="escuro">{c.status === "pausado" ? "Pausado" : "Saiu"}</Chip>}
                    {mostrarGestao && c.abertoATodos && <Chip tom="ok">Aberto a todos</Chip>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
