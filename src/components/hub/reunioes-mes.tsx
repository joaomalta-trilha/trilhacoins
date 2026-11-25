"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { atualizarReunioesAction } from "@/app/hub-actions";
import { type SituacaoDoMes, rotuloDaData } from "@/lib/hub/reunioes";
import { normalizarNome } from "@/lib/hub/texto";
import { RolagemX } from "@/components/rolagem-x";

export interface ReuniaoCurta {
  data: string;
  url: string;
}

export interface LinhaReuniao {
  id: string;
  slug: string;
  nome: string;
  iniciais: string;
  assessor: string | null;
  coordenacao: string | null;
  /** cliente ligado a uma opção do campo Clientes do ClickUp */
  ligado: boolean;
  /** frequência combinada no dossiê ("Mensal") */
  frequencia: string | null;
  esperadas: number | null;
  realizadas: number;
  agendadas: number;
  vencidas: number;
  proxima: ReuniaoCurta | null;
  ultima: ReuniaoCurta | null;
  situacao: SituacaoDoMes;
}

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

function pedeAtencao(l: LinhaReuniao): boolean {
  return l.ligado && (l.situacao === "vencida" || l.situacao === "falta");
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

/** Pontos do mês: cheio = realizada, contorno = agendada, laranja = vencida, tracejado = falta marcar. */
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

/**
 * Reuniões do mês, cliente por cliente: quantas aconteceram contra as
 * esperadas pela frequência do dossiê, a próxima marcada e a última feita.
 */
export function ReunioesDoMes({
  linhas,
  gestao,
  lidasEm,
}: {
  linhas: LinhaReuniao[];
  /** gestão vê assessor e coordenação; o assessor, só a carteira dele */
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
    [linhas]
  );

  const visiveis = useMemo(
    () =>
      linhas
        .filter((l) => (filtro === "atencao" ? pedeAtencao(l) : filtro === "em-dia" ? l.ligado && l.situacao === "em-dia" : true))
        .filter(
          (l) =>
            !termo ||
            normalizarNome(l.nome).includes(termo) ||
            normalizarNome(l.assessor ?? "").includes(termo) ||
            normalizarNome(l.coordenacao ?? "").includes(termo)
        )
        .sort(
          (a, b) =>
            Number(b.ligado) - Number(a.ligado) ||
            PESO[a.situacao] - PESO[b.situacao] ||
            a.nome.localeCompare(b.nome, "pt-BR")
        ),
    [linhas, filtro, termo]
  );

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
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Maceio", hour: "2-digit", minute: "2-digit" }).format(new Date(lidasEm))
    : null;

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

      <div className="card caixa-tabela central-caixa">
        <RolagemX>
          <table className="tabela tabela-reunioes">
            <caption className="sr-only">Reuniões do mês por cliente: realizadas, esperadas, próxima e última.</caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                {gestao && <th scope="col">Assessor</th>}
                {gestao && <th scope="col">Coordenação</th>}
                <th scope="col">No mês</th>
                <th scope="col">Próxima</th>
                <th scope="col">Última</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => {
                const sit = ROTULO_SITUACAO[l.situacao];
                return (
                  <tr key={l.id}>
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
                    {gestao && <td className="col-pessoa">{l.assessor ?? <span className="vazio-cel">Sem assessor</span>}</td>}
                    {gestao && <td className="col-pessoa">{l.coordenacao ?? <span className="vazio-cel">—</span>}</td>}
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
                      ) : gestao ? (
                        <Link href="/clientes/clickup" className="chip chip-atencao">
                          Sem vínculo com o ClickUp
                        </Link>
                      ) : (
                        <span className="chip">Sem vínculo com o ClickUp</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </RolagemX>
        {visiveis.length === 0 && (
          <div className="vazio central-vazio">
            <b>Nenhum cliente nesse filtro</b>
            <p>{termo ? "Confira o nome digitado." : "Volte para Todos para ver a lista inteira."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
