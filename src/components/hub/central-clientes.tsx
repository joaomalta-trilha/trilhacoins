"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Search } from "lucide-react";
import { atualizarClienteAction } from "@/app/hub-actions";
import {
  PENDENCIAS,
  type Pendencia,
  STATUS_TABELA,
  type StatusTabela,
  type LinhaCliente,
  type StatusLinha,
  enderecoDaTabela,
  passaNoStatus,
  resumoDoDossie,
  temPendencia,
} from "@/lib/hub/central-clientes";
import { normalizarNome } from "@/lib/hub/texto";
import { RolagemX } from "@/components/rolagem-x";
import { Estrelas } from "./basicos";
import { AvaliarExigencia, type ClienteAvaliado } from "./avaliar-exigencia";

type Status = StatusLinha;

const ROTULO_SITUACAO: Record<StatusTabela, string> = {
  ativos: "Ativos",
  pausados: "Pausados",
  inativos: "Inativos",
  todos: "Todos",
};

const ROTULO_PENDENCIA: Record<Pendencia, string> = {
  atencao: "Pede atenção",
  incompletos: "Dossiê incompleto",
  "sem-nota": "Sem nota de carteira",
};

export interface Opcao {
  id: string;
  nome: string;
}

/** O que muda na linha antes de o servidor confirmar. */
type Mudanca = Partial<Pick<LinhaCliente, "status" | "assessorId" | "coordenacaoId" | "pedeAtencao">>;

const ROTULO_STATUS: Record<Status, string> = { ativo: "Ativo", pausado: "Pausado", saiu: "Inativo" };
const ORDEM_STATUS: Record<Status, number> = { ativo: 0, pausado: 1, saiu: 2 };

type Coluna = "cliente" | "atencao" | "coordenacao" | "assessor" | "dossie" | "status" | "carteira";

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: "cliente", rotulo: "Cliente" },
  { chave: "atencao", rotulo: "Atenção" },
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
    case "atencao":
      // a primeira ordem já traz quem pede atenção no topo
      return Number(b.pedeAtencao) - Number(a.pedeAtencao);
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
 * Clientes (gestão): a planilha de controle. Uma linha por cliente, com o
 * aviso "pede atenção" (um interruptor), coordenação, assessor e status
 * editáveis na própria linha, o dossiê (completo ou não, e o atalho para o
 * formulário) e a nota de carteira, que abre o pop-up dos sete critérios.
 * Abre mostrando os ativos.
 */
export function CentralClientes({
  linhas,
  assessores,
  coordenadoras,
  coordenacaoPorCliente,
  podeTirarAssessor,
  statusInicial = "ativos",
  pendenciaInicial = null,
}: {
  linhas: LinhaCliente[];
  /** assessores que a pessoa logada pode escolher */
  assessores: Opcao[];
  coordenadoras: Opcao[];
  /** o banco já guarda a coordenação de cada cliente (migration 0010) */
  coordenacaoPorCliente: boolean;
  /** só a diretoria deixa um cliente sem assessor */
  podeTirarAssessor: boolean;
  statusInicial?: StatusTabela;
  pendenciaInicial?: Pendencia | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<StatusTabela>(statusInicial);
  const [pendencia, setPendencia] = useState<Pendencia | null>(pendenciaInicial);
  const [ordem, setOrdem] = useState<{ coluna: Coluna; sobe: boolean }>({ coluna: "cliente", sobe: true });
  const [local, setLocal] = useState<Record<string, Mudanca>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const [avaliando, setAvaliando] = useState<ClienteAvaliado | null>(null);
  // desmarcado com o recorte "Pede atenção" ligado: a linha fica até trocar o
  // filtro, para dar para voltar atrás no mesmo lugar
  const [mantidos, setMantidos] = useState<ReadonlySet<string>>(() => new Set());
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

  // o servidor manda a lista nova depois de salvar: as mudanças locais somem
  const [base, setBase] = useState(linhas);
  if (base !== linhas) {
    setBase(linhas);
    setLocal({});
  }

  const nomeDoAssessor = useMemo(() => new Map(assessores.map((a) => [a.id, a.nome])), [assessores]);
  const nomeDaCoordenadora = useMemo(() => new Map(coordenadoras.map((c) => [c.id, c.nome])), [coordenadoras]);

  const comLocal = useMemo(
    () =>
      linhas.map((l) => {
        const m = local[l.id];
        if (!m) return l;
        const v = { ...l, ...m };
        if (m.assessorId !== undefined) v.assessor = m.assessorId ? (nomeDoAssessor.get(m.assessorId) ?? l.assessor) : null;
        if (m.coordenacaoId !== undefined) {
          v.coordenacao = m.coordenacaoId ? [nomeDaCoordenadora.get(m.coordenacaoId) ?? ""] : [];
        }
        return v;
      }),
    [linhas, local, nomeDoAssessor, nomeDaCoordenadora]
  );

  const contagem = useMemo(() => {
    const porSituacao = Object.fromEntries(STATUS_TABELA.map((x) => [x, 0])) as Record<StatusTabela, number>;
    const porPendencia = Object.fromEntries(PENDENCIAS.map((x) => [x, 0])) as Record<Pendencia, number>;
    for (const l of comLocal) {
      for (const x of STATUS_TABELA) if (passaNoStatus(x, l)) porSituacao[x]++;
      // pendência conta dentro da situação escolhida ("ativos com dossiê incompleto")
      if (passaNoStatus(situacao, l)) for (const x of PENDENCIAS) if (temPendencia(x, l)) porPendencia[x]++;
    }
    return { porSituacao, porPendencia };
  }, [comLocal, situacao]);

  const visiveis = useMemo(() => {
    const lista = comLocal.filter(
      (l) =>
        passaNoStatus(situacao, l) &&
        (!pendencia || temPendencia(pendencia, l) || mantidos.has(l.id)) &&
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
  }, [comLocal, situacao, pendencia, termo, ordem, mantidos]);

  // guarda o filtro no endereço, sem recarregar a página
  function filtrar(s: StatusTabela, p: Pendencia | null) {
    setSituacao(s);
    setPendencia(p);
    setMantidos(new Set());
    window.history.replaceState(null, "", enderecoDaTabela(pathname, s, p));
  }

  function ordenar(coluna: Coluna) {
    setOrdem((o) => (o.coluna === coluna ? { coluna, sobe: !o.sobe } : { coluna, sobe: true }));
  }

  /** Muda na hora e confirma no servidor; se der erro, a linha volta como estava. */
  function mudar(l: LinhaCliente, mudanca: Mudanca, oQue: string) {
    setAviso(null);
    setLocal((x) => ({ ...x, [l.id]: { ...x[l.id], ...mudanca } }));
    iniciar(async () => {
      const r = await atualizarClienteAction(l.id, l.slug, mudanca);
      if (!r.ok) {
        setLocal((x) => {
          const resto = { ...x };
          delete resto[l.id];
          return resto;
        });
        setAviso(`Não deu para mudar ${oQue} de ${l.nome}: ${r.erro}`);
        return;
      }
      router.refresh();
    });
  }

  function marcarAtencao(l: LinhaCliente, ligado: boolean) {
    if (pendencia === "atencao") setMantidos((m) => new Set(m).add(l.id));
    mudar(l, { pedeAtencao: ligado }, "o aviso de atenção");
  }

  /** Opções de um seletor da linha: a atual entra mesmo se a pessoa não puder escolhê-la. */
  function opcoesCom(lista: Opcao[], atual: { id: string | null; nome: string | null }): Opcao[] {
    if (!atual.id || lista.some((o) => o.id === atual.id)) return lista;
    return [{ id: atual.id, nome: atual.nome ?? "Atual" }, ...lista];
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
        <div className="pills sub-pills" role="group" aria-label="Situação dos clientes">
          {STATUS_TABELA.map((x) => (
            <button key={x} type="button" className="pill" aria-pressed={situacao === x} onClick={() => filtrar(x, pendencia)}>
              {ROTULO_SITUACAO[x]}
              <em>{contagem.porSituacao[x]}</em>
            </button>
          ))}
        </div>
        <div className="pills sub-pills pendencias" role="group" aria-label="Pendências">
          {PENDENCIAS.map((x) => (
            <button
              key={x}
              type="button"
              className="pill"
              aria-pressed={pendencia === x}
              onClick={() => filtrar(situacao, pendencia === x ? null : x)}
            >
              {ROTULO_PENDENCIA[x]}
              <em>{contagem.porPendencia[x]}</em>
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
                          <small>{l.pacote ?? "Pacote a definir"}</small>
                        </span>
                      </Link>
                    </th>
                    <td className="col-atencao">
                      <input
                        type="checkbox"
                        role="switch"
                        className="interruptor"
                        checked={l.pedeAtencao}
                        aria-label={`${l.nome} pede atenção`}
                        title={l.pedeAtencao ? "Desmarcar: deixa de pedir atenção" : "Marcar que pede atenção"}
                        onChange={(e) => marcarAtencao(l, e.target.checked)}
                      />
                    </td>
                    <td className="col-coordenacao">
                      {coordenacaoPorCliente ? (
                        <select
                          className={`celula-select${l.coordenacaoId ? "" : " vazia"}`}
                          value={l.coordenacaoId ?? ""}
                          aria-label={`Coordenação de ${l.nome}`}
                          onChange={(e) => mudar(l, { coordenacaoId: e.target.value || null }, "a coordenação")}
                        >
                          <option value="">Sem coordenação</option>
                          {opcoesCom(coordenadoras, { id: l.coordenacaoId, nome: l.coordenacao[0] ?? null }).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nome}
                            </option>
                          ))}
                        </select>
                      ) : l.coordenacao.length ? (
                        l.coordenacao.join(", ")
                      ) : (
                        <span className="vazio-cel">Sem vínculo</span>
                      )}
                    </td>
                    <td className="col-assessor">
                      <select
                        className={`celula-select${l.assessorId ? "" : " vazia alerta"}`}
                        value={l.assessorId ?? ""}
                        aria-label={`Assessor de ${l.nome}`}
                        onChange={(e) => mudar(l, { assessorId: e.target.value || null }, "o assessor")}
                      >
                        {(podeTirarAssessor || !l.assessorId) && <option value="">Sem assessor</option>}
                        {opcoesCom(assessores, { id: l.assessorId, nome: l.assessor }).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nome}
                          </option>
                        ))}
                      </select>
                    </td>
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
                          onChange={(e) => mudar(l, { status: e.target.value as Status }, "o status")}
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
              {situacao !== "todos" || pendencia ? " ou veja Todos, sem pendência marcada." : "."}
            </p>
          </div>
        )}
      </div>

      <AvaliarExigencia key={avaliando?.id ?? "nenhum"} cliente={avaliando} aoFechar={() => setAvaliando(null)} />
    </div>
  );
}
