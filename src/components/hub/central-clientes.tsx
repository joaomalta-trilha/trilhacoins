"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Search } from "lucide-react";
import { atualizarClienteAction } from "@/app/hub-actions";
import {
  FILTROS_TABELA,
  type FiltroTabela,
  type LinhaCliente,
  type StatusLinha,
  passaNoFiltro,
  resumoDoDossie,
} from "@/lib/hub/central-clientes";
import { normalizarNome } from "@/lib/hub/texto";
import { RolagemX } from "@/components/rolagem-x";
import { Estrelas } from "./basicos";
import { AvaliarExigencia, type ClienteAvaliado } from "./avaliar-exigencia";

type Status = StatusLinha;

const ROTULO_FILTRO: Record<FiltroTabela, string> = {
  todos: "Todos",
  incompletos: "Dossiê incompleto",
  "sem-nota": "Sem nota de carteira",
  pausados: "Pausados",
  inativos: "Inativos",
};

const ROTULO_STATUS: Record<Status, string> = { ativo: "Ativo", pausado: "Pausado", saiu: "Inativo" };
const ORDEM_STATUS: Record<Status, number> = { ativo: 0, pausado: 1, saiu: 2 };

type Coluna = "cliente" | "coordenacao" | "assessor" | "dossie" | "status" | "carteira";

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "coordenacao", rotulo: "Coordenação" },
  { chave: "assessor", rotulo: "Assessor responsável" },
  { chave: "dossie", rotulo: "Dossiê" },
  { chave: "status", rotulo: "Status" },
  { chave: "carteira", rotulo: "Carteira" },
];

/** Célula sem valor na coluna: vai para o fim da lista, em qualquer direção da ordem. */
function vazia(coluna: Coluna, l: LinhaCliente): boolean {
  if (coluna === "coordenacao") return l.coordenacao.length === 0;
  if (coluna === "assessor") return !l.assessor;
  if (coluna === "carteira") return l.pts === null;
  return false;
}

function comparar(coluna: Coluna, a: LinhaCliente, b: LinhaCliente): number {
  switch (coluna) {
    case "coordenacao":
      return (a.coordenacao[0] ?? "").localeCompare(b.coordenacao[0] ?? "", "pt-BR");
    case "assessor":
      return (a.assessor ?? "").localeCompare(b.assessor ?? "", "pt-BR");
    case "dossie":
      return a.dossie.respondidas - b.dossie.respondidas;
    case "status":
      return ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status];
    case "carteira":
      return (a.pts ?? 0) - (b.pts ?? 0);
    default:
      return 0;
  }
}

/**
 * Clientes (gestão): a planilha de controle. Uma linha por cliente, com
 * coordenação, assessor, dossiê (completo ou não, e o atalho para o
 * formulário), status editável na própria linha e a nota de carteira,
 * que abre o pop-up dos sete critérios.
 */
export function CentralClientes({ linhas, filtroInicial = "todos" }: { linhas: LinhaCliente[]; filtroInicial?: FiltroTabela }) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FiltroTabela>(filtroInicial);
  const [ordem, setOrdem] = useState<{ coluna: Coluna; sobe: boolean }>({ coluna: "cliente", sobe: true });
  const [statusLocal, setStatusLocal] = useState<Record<string, Status>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const [avaliando, setAvaliando] = useState<ClienteAvaliado | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const termo = normalizarNome(busca);

  // "/" leva direto para a busca, como no resto do Hub
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (alvo && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      e.preventDefault();
      campo.current?.focus();
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  // o servidor manda a lista nova depois de salvar: o status local some
  const [base, setBase] = useState(linhas);
  if (base !== linhas) {
    setBase(linhas);
    setStatusLocal({});
  }

  const comStatus = useMemo(
    () => linhas.map((l) => (statusLocal[l.id] ? { ...l, status: statusLocal[l.id] } : l)),
    [linhas, statusLocal]
  );

  const contagem = useMemo(() => {
    const n = Object.fromEntries(FILTROS_TABELA.map((f) => [f, 0])) as Record<FiltroTabela, number>;
    for (const l of comStatus) for (const f of FILTROS_TABELA) if (passaNoFiltro(f, l)) n[f]++;
    return n;
  }, [comStatus]);

  const visiveis = useMemo(() => {
    const lista = comStatus.filter(
      (l) =>
        passaNoFiltro(filtro, l) &&
        (!termo ||
          normalizarNome(l.nome).includes(termo) ||
          normalizarNome(l.assessor ?? "").includes(termo) ||
          l.coordenacao.some((c) => normalizarNome(c).includes(termo)))
    );
    const dir = ordem.sobe ? 1 : -1;
    return lista.sort((a, b) => {
      const va = vazia(ordem.coluna, a);
      if (va !== vazia(ordem.coluna, b)) return va ? 1 : -1;
      const porNome = a.nome.localeCompare(b.nome, "pt-BR");
      return ordem.coluna === "cliente" ? porNome * dir : comparar(ordem.coluna, a, b) * dir || porNome;
    });
  }, [comStatus, filtro, termo, ordem]);

  function escolher(f: FiltroTabela) {
    setFiltro(f);
    // guarda o filtro no endereço, sem recarregar a página
    window.history.replaceState(null, "", f === "todos" ? pathname : `${pathname}?filtro=${f}`);
  }

  function ordenar(coluna: Coluna) {
    setOrdem((o) => (o.coluna === coluna ? { coluna, sobe: !o.sobe } : { coluna, sobe: true }));
  }

  function mudarStatus(l: LinhaCliente, novo: Status) {
    const antes = l.status;
    setAviso(null);
    setStatusLocal((s) => ({ ...s, [l.id]: novo }));
    iniciar(async () => {
      const r = await atualizarClienteAction(l.id, l.slug, { status: novo });
      if (!r.ok) {
        setStatusLocal((s) => ({ ...s, [l.id]: antes }));
        setAviso(`Não deu para mudar o status de ${l.nome}: ${r.erro}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="central-clientes">
      <div className="ferramentas">
        <label className="busca">
          <Search strokeWidth={1.6} aria-hidden="true" />
          <input
            ref={campo}
            type="search"
            placeholder="Buscar cliente ou pessoa"
            aria-label="Buscar cliente, assessor ou coordenação"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <div className="pills sub-pills" role="group" aria-label="Filtrar clientes">
          {FILTROS_TABELA.map((f) => (
            <button key={f} type="button" className="pill" aria-pressed={filtro === f} onClick={() => escolher(f)}>
              {ROTULO_FILTRO[f]}
              <em>{contagem[f]}</em>
            </button>
          ))}
        </div>
      </div>

      <p role="status" className={aviso ? "aviso aviso-erro central-aviso" : "sr-only"}>
        {aviso ?? ""}
      </p>

      <div className="card caixa-tabela central-caixa">
        <RolagemX>
          <table className="tabela tabela-clientes">
            <caption className="sr-only">
              Clientes, {visiveis.length} de {linhas.length} na lista. Os títulos das colunas ordenam a planilha.
            </caption>
            <thead>
              <tr>
                {COLUNAS.map((c) => {
                  const ativa = ordem.coluna === c.chave;
                  return (
                    <th
                      key={c.chave}
                      scope="col"
                      className={`col-${c.chave}`}
                      aria-sort={ativa ? (ordem.sobe ? "ascending" : "descending") : "none"}
                    >
                      <button type="button" className="ordenar" onClick={() => ordenar(c.chave)}>
                        {c.rotulo}
                        {ativa &&
                          (ordem.sobe ? (
                            <ArrowUp strokeWidth={1.8} aria-hidden="true" />
                          ) : (
                            <ArrowDown strokeWidth={1.8} aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => {
                const completo = l.dossie.faltam.length === 0;
                return (
                  <tr key={l.id} className={l.status === "saiu" ? "linha-inativa" : undefined}>
                    <th scope="row" className="col-cliente">
                      <Link href={`/clientes/${l.slug}`} className="cliente-cel">
                        <span className="ic" aria-hidden="true">
                          {l.iniciais}
                          {l.pedeAtencao && <i className="ponto" />}
                        </span>
                        <span className="cliente-nome">
                          <b>{l.nome}</b>
                          <small>
                            {l.pedeAtencao ? "Pede atenção" : (l.pacote ?? "Pacote a definir")}
                            {l.pedeAtencao && l.pacote ? ` · ${l.pacote}` : ""}
                          </small>
                        </span>
                      </Link>
                    </th>
                    <td className="col-coordenacao">
                      {l.coordenacao.length ? l.coordenacao.join(", ") : <span className="vazio-cel">Sem vínculo</span>}
                    </td>
                    <td className="col-assessor">{l.assessor ?? <span className="vazio-cel alerta">Sem assessor</span>}</td>
                    <td className="col-dossie">
                      <div className="dossie-cel">
                        <span className="dossie-estado" title={completo ? undefined : `Falta: ${l.dossie.faltam.join(", ")}`}>
                          <span className={`chip ${completo ? "chip-ok" : "chip-atencao"}`}>{completo ? "Completo" : "Incompleto"}</span>
                          <small>{resumoDoDossie(l.dossie)}</small>
                        </span>
                        <Link
                          href={`/clientes/${l.slug}/dossie`}
                          className="btn btn-secundario btn-mini"
                          aria-label={`Preencher o dossiê de ${l.nome}`}
                        >
                          <ClipboardList strokeWidth={1.6} aria-hidden="true" />
                          Preencher
                        </Link>
                      </div>
                    </td>
                    <td className="col-status">
                      <span className={`status-cel status-${l.status}`}>
                        <i aria-hidden="true" />
                        <select
                          className="status-select"
                          value={l.status}
                          aria-label={`Status de ${l.nome}`}
                          onChange={(e) => mudarStatus(l, e.target.value as Status)}
                        >
                          {(Object.keys(ROTULO_STATUS) as Status[]).map((s) => (
                            <option key={s} value={s}>
                              {ROTULO_STATUS[s]}
                            </option>
                          ))}
                        </select>
                      </span>
                    </td>
                    <td className="col-carteira">
                      <button
                        type="button"
                        className={`nota-cel${l.pts === null ? " sem-nota" : ""}`}
                        onClick={() => setAvaliando({ id: l.id, slug: l.slug, nome: l.nome, pts: l.pts, criterios: l.criterios })}
                        aria-label={
                          l.pts === null
                            ? `Avaliar a exigência de ${l.nome}`
                            : `Rever a exigência de ${l.nome}, hoje ${l.pts} pontos`
                        }
                      >
                        {l.pts === null ? (
                          <span className="nota-vazia">Avaliar</span>
                        ) : (
                          <>
                            <Estrelas pts={l.pts} />
                            <span className="nota-pts">{l.pts} pts</span>
                          </>
                        )}
                      </button>
                      {l.pts !== null && !l.criterios && <small className="nota-detalhe">sem os critérios</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </RolagemX>
        {visiveis.length === 0 && (
          <div className="vazio central-vazio">
            <b>Nenhum cliente encontrado</b>
            <p>
              {termo ? "Confira o nome digitado" : "Nenhum cliente nesse filtro"}
              {filtro !== "todos" ? " ou volte para Todos." : "."}
            </p>
          </div>
        )}
      </div>

      <AvaliarExigencia key={avaliando?.id ?? "nenhum"} cliente={avaliando} aoFechar={() => setAvaliando(null)} />
    </div>
  );
}
