"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { atualizarClienteAction } from "@/app/hub-actions";
import { RolagemX } from "@/components/rolagem-x";

export interface LinhaVinculo {
  id: string;
  slug: string;
  nome: string;
  inativo: boolean;
  opcaoId: string | null;
  /** a opção ligada não está mais entre as opções do campo no ClickUp */
  opcaoSumiu: boolean;
  /** outros clientes do Hub ligados à mesma opção (um grupo no ClickUp) */
  compartilhaCom: string[];
  sugestao: { id: string; nome: string } | null;
}

type Filtro = "todos" | "sem-vinculo";

/**
 * Conciliação do Hub com o campo "Clientes" do ClickUp: cada cliente
 * escolhe a opção dele. Mudou, gravou (como na planilha de Clientes).
 */
export function VinculoClickUp({ linhas, opcoes }: { linhas: LinhaVinculo[]; opcoes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>(() => (linhas.some((l) => !l.opcaoId) ? "sem-vinculo" : "todos"));
  const [local, setLocal] = useState<Record<string, string | null>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // lista nova do servidor depois de salvar: as escolhas locais somem
  const [base, setBase] = useState(linhas);
  if (base !== linhas) {
    setBase(linhas);
    setLocal({});
  }

  const nomeDaOpcao = useMemo(() => new Map(opcoes.map((o) => [o.id, o.nome])), [opcoes]);
  const comLocal = linhas.map((l) => (l.id in local ? { ...l, opcaoId: local[l.id], opcaoSumiu: false } : l));
  const semVinculo = comLocal.filter((l) => !l.opcaoId).length;
  const visiveis = filtro === "sem-vinculo" ? comLocal.filter((l) => !l.opcaoId) : comLocal;

  function ligar(l: LinhaVinculo, opcaoId: string | null) {
    setAviso(null);
    setLocal((x) => ({ ...x, [l.id]: opcaoId }));
    iniciar(async () => {
      const r = await atualizarClienteAction(l.id, l.slug, { clickupClienteOpcao: opcaoId });
      if (!r.ok) {
        setLocal((x) => {
          const resto = { ...x };
          delete resto[l.id];
          return resto;
        });
        setAviso(`Não deu para ligar ${l.nome}: ${r.erro}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="vinculo-clickup">
      <div className="ferramentas">
        <div className="pills sub-pills" role="group" aria-label="Filtrar clientes">
          <button type="button" className="pill" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos
            <em>{comLocal.length}</em>
          </button>
          <button
            type="button"
            className="pill"
            aria-pressed={filtro === "sem-vinculo"}
            onClick={() => setFiltro("sem-vinculo")}
          >
            Sem vínculo
            <em>{semVinculo}</em>
          </button>
        </div>
      </div>

      <p role="status" className={aviso ? "aviso aviso-erro central-aviso" : "sr-only"}>
        {aviso ?? ""}
      </p>

      <div className="card caixa-tabela central-caixa">
        <RolagemX>
          <table className="tabela tabela-vinculo">
            <caption className="sr-only">Clientes do Hub e a opção de cada um no campo Clientes do ClickUp.</caption>
            <thead>
              <tr>
                <th scope="col">Cliente no Hub</th>
                <th scope="col">Opção no ClickUp</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((l) => (
                <tr key={l.id} className={l.inativo ? "linha-inativa" : undefined}>
                  <th scope="row">
                    <Link href={`/clientes/${l.slug}`} className="vinculo-nome">
                      {l.nome}
                    </Link>
                    {l.inativo && <small className="vinculo-inativo">inativo</small>}
                  </th>
                  <td>
                    <select
                      className={`celula-select vinculo-select${l.opcaoId ? "" : " vazia alerta"}`}
                      value={l.opcaoId ?? ""}
                      aria-label={`Opção do ClickUp de ${l.nome}`}
                      onChange={(e) => ligar(l, e.target.value || null)}
                    >
                      <option value="">Sem vínculo</option>
                      {l.opcaoId && !nomeDaOpcao.has(l.opcaoId) && <option value={l.opcaoId}>Opção que saiu do ClickUp</option>}
                      {opcoes.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="vinculo-situacao">
                      {!l.opcaoId ? (
                        <>
                          <span className="chip chip-acento">Sem vínculo</span>
                          {l.sugestao && (
                            <button type="button" className="btn btn-secundario" onClick={() => ligar(l, l.sugestao!.id)}>
                              Usar {l.sugestao.nome}
                            </button>
                          )}
                        </>
                      ) : l.opcaoSumiu ? (
                        <span className="chip chip-atencao">A opção saiu do ClickUp: escolha outra</span>
                      ) : l.compartilhaCom.length ? (
                        <span className="chip">Mesma opção de {l.compartilhaCom.join(", ")}</span>
                      ) : (
                        <span className="chip chip-ok">Ligado</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </RolagemX>
        {visiveis.length === 0 && (
          <div className="vazio central-vazio">
            <b>Todos os clientes estão ligados ao ClickUp</b>
            <p>As reuniões de cada cliente chegam pelo campo Clientes. Veja a lista completa em Todos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
