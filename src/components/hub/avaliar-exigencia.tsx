"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { avaliarExigenciaAction } from "@/app/hub-actions";
import {
  CRITERIOS_EXIGENCIA,
  type ChaveCriterio,
  type NotasCriterios,
  faixaDaExigencia,
  pontosDosCriterios,
} from "@/lib/hub/exigencia";
import { Estrelas } from "./basicos";

export interface ClienteAvaliado {
  id: string;
  slug: string;
  nome: string;
  pts: number | null;
  criterios: NotasCriterios | null;
}

/**
 * Pop-up da carteira: a nota de cada um dos sete critérios da planilha de
 * controle de carteira, de 1 até o peso do critério. A soma vira os pontos
 * e as estrelas do cliente. Abre quando recebe um cliente; fechar (Esc,
 * Cancelar ou clique fora) descarta o que não foi salvo.
 */
export function AvaliarExigencia({ cliente, aoFechar }: { cliente: ClienteAvaliado | null; aoFechar: () => void }) {
  const router = useRouter();
  const caixa = useRef<HTMLDialogElement>(null);
  const [notas, setNotas] = useState<NotasCriterios>(cliente?.criterios ?? {});
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    const d = caixa.current;
    if (cliente && d && !d.open) d.showModal();
  }, [cliente]);

  if (!cliente) return null;

  const total = pontosDosCriterios(notas);
  const faixa = faixaDaExigencia(total);
  const faltam = CRITERIOS_EXIGENCIA.filter((c) => !notas[c.chave]).length;
  const semDetalhe = cliente.pts !== null && !cliente.criterios;
  const mudou = CRITERIOS_EXIGENCIA.some((c) => notas[c.chave] !== cliente.criterios?.[c.chave]);

  function marcar(chave: ChaveCriterio, n: number) {
    setNotas((x) => ({ ...x, [chave]: n }));
    setErro(null);
  }

  function fechar() {
    caixa.current?.close();
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!cliente || total === null) return;
    setErro(null);
    iniciar(async () => {
      const r = await avaliarExigenciaAction(cliente.id, cliente.slug, notas);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      fechar();
      router.refresh();
    });
  }

  return (
    <dialog
      ref={caixa}
      className="dialogo"
      aria-labelledby="avaliar-titulo"
      aria-describedby="avaliar-explica"
      onClose={aoFechar}
      onClick={(e) => {
        // clique no fundo escurecido (fora da caixa) fecha
        if (e.target === caixa.current) fechar();
      }}
    >
      <form className="dialogo-form" onSubmit={salvar}>
        <header className="dialogo-topo">
          <div>
            <h2 id="avaliar-titulo">Exigência de {cliente.nome}</h2>
            <p id="avaliar-explica">
              Dê a cada critério uma nota de 1 até o peso dele. As notas 1, 2 e 3 de cada critério são a referência da
              planilha de controle de carteira.
            </p>
          </div>
          <button type="button" className="btn-circulo dialogo-fechar" aria-label="Fechar sem salvar" onClick={fechar}>
            <X strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className="dialogo-rolagem">
          {semDetalhe && (
            <p className="aviso">
              Hoje a nota é {cliente.pts} pontos, sem o detalhe dos critérios. Ao salvar, passa a valer a soma das notas
              abaixo.
            </p>
          )}
          {CRITERIOS_EXIGENCIA.map((c) => (
            <fieldset key={c.chave} className="criterio">
              <legend className="criterio-cab">
                <span className="criterio-nome">{c.criterio}</span>
                <span className="criterio-peso">de 1 a {c.pesoMaximo}</span>
              </legend>
              <div className="criterio-notas">
                {Array.from({ length: c.pesoMaximo }, (_, i) => i + 1).map((n) => (
                  <label key={n} className="nota-opcao">
                    <input
                      type="radio"
                      name={c.chave}
                      value={n}
                      checked={notas[c.chave] === n}
                      onChange={() => marcar(c.chave, n)}
                      aria-label={`${c.criterio}: nota ${n} de ${c.pesoMaximo}`}
                    />
                    <span aria-hidden="true">{n}</span>
                  </label>
                ))}
              </div>
              <ul className="criterio-refs">
                <li>
                  <b>Nota 1</b>
                  {c.nota1}
                </li>
                <li>
                  <b>Nota 2</b>
                  {c.nota2}
                </li>
                <li>
                  <b>Nota 3</b>
                  {c.nota3}
                </li>
              </ul>
            </fieldset>
          ))}
        </div>

        <footer className="dialogo-rodape">
          <div className="total-exigencia" aria-live="polite">
            {total !== null && faixa ? (
              <>
                <b>{total}</b>
                <span className="total-rotulo">
                  pontos <Estrelas pts={total} />
                  <small>
                    Exigência {faixa.exigencia.toLowerCase()} · indicado: {faixa.indicado.toLowerCase()}
                  </small>
                </span>
              </>
            ) : (
              <span className="total-rotulo">
                Faltam {faltam} {faltam === 1 ? "critério" : "critérios"}
                <small>A nota aparece quando os sete tiverem nota.</small>
              </span>
            )}
          </div>
          <div className="dialogo-acoes">
            {erro && (
              <span role="alert" className="erro-inline">
                {erro}
              </span>
            )}
            <button type="button" className="btn btn-secundario" onClick={fechar}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primario" disabled={total === null || !mudou || pendente}>
              {pendente ? "Salvando…" : "Salvar nota"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
