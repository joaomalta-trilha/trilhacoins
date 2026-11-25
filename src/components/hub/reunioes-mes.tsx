"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { atualizarReunioesAction } from "@/app/hub-actions";
import {
  type ContaDoGrupo,
  type GrupoSquad,
  type LinhaReuniao,
  type ReuniaoCurta,
  type SituacaoDoMes,
  agruparPorSquad,
  contarClientesComReuniao,
  rotuloDaData,
} from "@/lib/hub/reunioes";
import { normalizarNome } from "@/lib/hub/texto";
import { RolagemX } from "@/components/rolagem-x";

export type { LinhaReuniao, ReuniaoCurta };

type Filtro = "todos" | "atencao" | "em-dia";

const ROTULO_SITUACAO: Record<SituacaoDoMes, { texto: string; tom: string }> = {
  vencida: { texto: "Reunião vencida", tom: "chip-acento" },
  falta: { texto: "Falta reunião", tom: "chip-atencao" },
  agendada: { texto: "Agendada", tom: "chip-borda" },
  "em-dia": { texto: "Em dia", tom: "chip-ok" },
  "sem-previsao": { texto: "Sem frequência", tom: "" },
};

// quem pede ação primeiro
const PESO: Record<SituacaoDoMes, number> = { vencida: 0, falta: 1, agendada: 2, "sem-previsao": 3, "em-dia": 4 };

const COLUNAS = ["Cliente", "No mês", "Próxima", "Última", "Situação"];

function pedeAtencao(l: LinhaReuniao): boolean {
  return l.ligado && (l.situacao === "vencida" || l.situacao === "falta");
}

function ordenar(a: LinhaReuniao, b: LinhaReuniao): number {
  return (
    Number(b.ligado) - Number(a.ligado) || PESO[a.situacao] - PESO[b.situacao] || a.nome.localeCompare(b.nome, "pt-BR")
  );
}

function Quando({ r, vazio }: { r: ReuniaoCurta | null; vazio: string }) {
  if (!r) return <span className="vazio-cel">{vazio}</span>;
  const { dia, hora } = rotuloDaData(r.data);
  return (
    <a href={r.url} target="_blank" rel="noreferrer" className="quando-link">
      {dia}
      {hora && <small> · {hora}</small>}
      <ExternalLink strokeWidth={1.6} aria-hidden="true" />
      <span className="sr-only">(abre no ClickUp)</span>
    </a>
  );
}

/** Pontos do mês: cheio = realizada, laranja = vencida, contorno = agendada, tracejado = falta marcar. */
function Pontos({ l }: { l: LinhaReuniao }) {
  const faltam = Math.max(0, (l.esperadas ?? 0) - l.realizadas - l.agendadas - l.vencidas);
  const pontos = [
    ...Array<string>(l.realizadas).fill("feito"),
    ...Array<string>(l.vencidas).fill("vencido"),
    ...Array<string>(l.agendadas).fill("marcado"),
    ...Array<string>(faltam).fill("falta"),
  ].slice(0, 8);
  if (!pontos.length) return null;
  return (
    <span className="pontos-mes" aria-hidden="true">
      {pontos.map((p, i) => (
        <i key={i} className={`ponto-${p}`} />
      ))}
    </span>
  );
}

/** "4/9 clientes com reunião", com a barrinha. */
export function ContaClientes({ conta, forte = false }: { conta: ContaDoGrupo; forte?: boolean }) {
  const pct = conta.clientes ? Math.round((conta.comReuniao / conta.clientes) * 100) : 0;
  return (
    <span className={`conta-clientes${forte ? " forte" : ""}`}>
      <b>
        {conta.comReuniao}/{conta.clientes}
      </b>{" "}
      {conta.clientes === 1 ? "cliente" : "clientes"} com reunião
      <span className="conta-barra" aria-hidden="true">
        <i style={{ width: `${pct}%` }} />
      </span>
      <small>
        {conta.reunioes} {conta.reunioes === 1 ? "reunião feita" : "reuniões feitas"}
      </small>
    </span>
  );
}

function LinhaCliente({ l }: { l: LinhaReuniao }) {
  const sit = ROTULO_SITUACAO[l.situacao];
  return (
    <tr>
      <th scope="row">
        <Link href={`/clientes/${l.slug}`} className="cliente-cel">
          <span className="ic" aria-hidden="true">
            {l.iniciais}
          </span>
          <span className="cliente-nome">
            <b>{l.nome}</b>
            <small>{l.frequencia ? `Reunião ${l.frequencia.toLowerCase()}` : "Frequência a combinar"}</small>
          </span>
        </Link>
      </th>
      <td>
        {l.ligado ? (
          <span className="no-mes">
            <b>
              {l.realizadas}
              {l.esperadas ? <small> de {l.esperadas}</small> : null}
            </b>
            <Pontos l={l} />
          </span>
        ) : (
          <span className="vazio-cel">—</span>
        )}
      </td>
      <td>{l.ligado ? <Quando r={l.proxima} vazio="Nada marcado" /> : <span className="vazio-cel">—</span>}</td>
      <td>{l.ligado ? <Quando r={l.ultima} vazio="Sem registro" /> : <span className="vazio-cel">—</span>}</td>
      <td>
        {l.ligado ? (
          <span className={`chip ${sit.tom}`}>{sit.texto}</span>
        ) : (
          <Link href="/clientes/clickup" className="chip chip-atencao">
            Sem vínculo com o ClickUp
          </Link>
        )}
      </td>
    </tr>
  );
}

function Cabecalho() {
  return (
    <thead>
      <tr>
        {COLUNAS.map((c) => (
          <th key={c} scope="col">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/**
 * Reuniões do mês. Na gestão, os clientes vêm por squad e, dentro, por
 * assessor, cada grupo com a conta "clientes com reunião". O assessor vê
 * só a carteira dele, numa tabela.
 */
export function ReunioesDoMes({
  linhas,
  gestao,
  lidasEm,
}: {
  linhas: LinhaReuniao[];
  /** gestão vê squads e assessores; o assessor, só a carteira dele */
  gestao: boolean;
  lidasEm: string | null;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [atualizando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const termo = normalizarNome(busca);

  const contagem = useMemo(
    () => ({
      todos: linhas.length,
      atencao: linhas.filter(pedeAtencao).length,
      "em-dia": linhas.filter((l) => l.ligado && l.situacao === "em-dia").length,
    }),
    [linhas],
  );

  const passa = (l: LinhaReuniao) =>
    (filtro === "atencao" ? pedeAtencao(l) : filtro === "em-dia" ? l.ligado && l.situacao === "em-dia" : true) &&
    (!termo ||
      normalizarNome(l.nome).includes(termo) ||
      normalizarNome(l.assessor ?? "").includes(termo) ||
      normalizarNome(l.coordenacao ?? "").includes(termo));

  // a conta de cada grupo é sempre da carteira inteira; o filtro só esconde linhas
  const grupos: GrupoSquad<LinhaReuniao>[] = useMemo(() => (gestao ? agruparPorSquad(linhas) : []), [gestao, linhas]);
  const visiveis = linhas.filter(passa).sort(ordenar);

  function atualizar() {
    setErro(null);
    iniciar(async () => {
      const r = await atualizarReunioesAction();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.refresh();
    });
  }

  const horaLida = lidasEm
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Maceio", hour: "2-digit", minute: "2-digit" }).format(
        new Date(lidasEm),
      )
    : null;

  const vazio = (
    <div className="vazio central-vazio">
      <b>Nenhum cliente nesse filtro</b>
      <p>{termo ? "Confira o nome digitado." : "Volte para Todos para ver a lista inteira."}</p>
    </div>
  );

  return (
    <div className="reunioes-mes">
      <div className="ferramentas">
        <label className="busca">
          <Search strokeWidth={1.6} aria-hidden="true" />
          <input
            type="search"
            placeholder={gestao ? "Buscar cliente ou pessoa" : "Buscar cliente"}
            aria-label={gestao ? "Buscar cliente, assessor ou coordenação" : "Buscar cliente"}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <div className="pills sub-pills" role="group" aria-label="Filtrar clientes">
          {(
            [
              ["todos", "Todos"],
              ["atencao", "Pedem atenção"],
              ["em-dia", "Em dia"],
            ] as [Filtro, string][]
          ).map(([f, rotulo]) => (
            <button key={f} type="button" className="pill" aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {rotulo}
              <em>{contagem[f]}</em>
            </button>
          ))}
        </div>
        <div className="atualizar-reunioes">
          <button type="button" className="btn btn-secundario" onClick={atualizar} disabled={atualizando}>
            <RefreshCw strokeWidth={1.6} aria-hidden="true" className={atualizando ? "girando" : undefined} />
            {atualizando ? "Lendo o ClickUp…" : "Atualizar agora"}
          </button>
          <span role="status" className={erro ? "erro-inline" : "muted pequeno"}>
            {erro ?? (horaLida ? `Lido do ClickUp às ${horaLida}` : "")}
          </span>
        </div>
      </div>

      {!gestao ? (
        <div className="card caixa-tabela central-caixa">
          <RolagemX>
            <table className="tabela tabela-reunioes">
              <caption className="sr-only">
                Reuniões do mês por cliente: realizadas, esperadas, próxima e última.
              </caption>
              <Cabecalho />
              <tbody>
                {visiveis.map((l) => (
                  <LinhaCliente key={l.id} l={l} />
                ))}
              </tbody>
            </table>
          </RolagemX>
          {visiveis.length === 0 && vazio}
        </div>
      ) : (
        <>
          {grupos.map((sq) => {
            const assessores = sq.assessores
              .map((a) => ({ ...a, visiveis: a.linhas.filter(passa).sort(ordenar) }))
              .filter((a) => a.visiveis.length > 0);
            if (!assessores.length) return null;
            const doSquad = sq.assessores.flatMap((a) => a.linhas);
            return (
              <section key={sq.chave} className="squad" aria-labelledby={`sq-${sq.chave}`}>
                <div className="squad-cab">
                  <div>
                    <h2 id={`sq-${sq.chave}`}>{sq.rotulo}</h2>
                    {sq.coordenacao && <p>Coordenação de {sq.coordenacao}</p>}
                  </div>
                  <ContaClientes conta={contarClientesComReuniao(doSquad)} forte />
                </div>
                <div className="card caixa-tabela">
                  <RolagemX>
                    <table className="tabela tabela-reunioes agrupada">
                      <caption className="sr-only">{sq.rotulo}: reuniões do mês por assessor e cliente.</caption>
                      <Cabecalho />
                      {assessores.map((a) => (
                        <tbody key={a.chave}>
                          <tr className="grupo-assessor">
                            <th scope="rowgroup" colSpan={COLUNAS.length}>
                              <div className="grupo-assessor-cab">
                                <span className="grupo-assessor-nome">{a.nome}</span>
                                <ContaClientes conta={contarClientesComReuniao(a.linhas)} />
                              </div>
                            </th>
                          </tr>
                          {a.visiveis.map((l) => (
                            <LinhaCliente key={l.id} l={l} />
                          ))}
                        </tbody>
                      ))}
                    </table>
                  </RolagemX>
                </div>
              </section>
            );
          })}
          {visiveis.length === 0 && <div className="central-caixa">{vazio}</div>}
        </>
      )}
    </div>
  );
}
