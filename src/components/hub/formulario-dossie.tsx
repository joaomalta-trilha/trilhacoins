"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { salvarFormularioDossieAction } from "@/app/hub-actions";
import {
  BLOCOS_DO_DOSSIE,
  type ChaveUma,
  type ChaveVarias,
  type Pergunta,
  type RespostasDossie,
} from "@/lib/hub/formulario-dossie";

/**
 * O formulário do dossiê dentro do Hub: as mesmas perguntas que a
 * coordenação respondia fora dele. Salvar escreve as respostas no dossiê
 * do cliente; o que ficar em branco não apaga o que já estava escrito.
 */
export function FormularioDossie({
  clienteId,
  slug,
  inicial,
  hoje,
  temDossie,
}: {
  clienteId: string;
  slug: string;
  inicial: RespostasDossie;
  hoje: Partial<Record<ChaveUma | ChaveVarias, string>>;
  temDossie: boolean;
}) {
  const router = useRouter();
  const [r, setR] = useState<RespostasDossie>(inicial);
  const [sujo, setSujo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // sair da página com respostas não salvas pede confirmação do navegador
  useEffect(() => {
    if (!sujo) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sujo]);

  function mudar<K extends keyof RespostasDossie>(chave: K, valor: RespostasDossie[K]) {
    setR((x) => ({ ...x, [chave]: valor }));
    setSujo(true);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const res = await salvarFormularioDossieAction(clienteId, slug, r);
      if (!res.ok) {
        setErro(res.erro);
        return;
      }
      setSujo(false);
      router.push(`/clientes/${encodeURIComponent(slug)}`);
      router.refresh();
    });
  }

  function campoDe(p: Pergunta) {
    const id = `dossie-${p.chave}`;
    if (p.tipo === "uma" || p.tipo === "varias") {
      const marcadas = p.tipo === "uma" ? [r[p.chave]] : r[p.chave];
      return (
        <fieldset key={p.chave} className="pergunta">
          <legend className="pergunta-titulo">{p.pergunta}</legend>
          <div className="escolha-chips" role="group" aria-label={p.pergunta}>
            {p.opcoes.map((o) => {
              const marcada = marcadas.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  className="chip-escolha"
                  aria-pressed={marcada}
                  onClick={() => {
                    if (p.tipo === "uma") mudar(p.chave, marcada && p.chave !== "status" ? "" : o);
                    else mudar(p.chave, marcada ? r[p.chave].filter((x) => x !== o) : [...r[p.chave], o]);
                  }}
                >
                  {marcada && <Check strokeWidth={2} aria-hidden="true" />}
                  {o}
                </button>
              );
            })}
          </div>
          {p.tipo === "varias" && p.outro && (
            <input
              className="input"
              value={r[p.outro]}
              onChange={(e) => mudar(p.outro as "objetivoOutro", e.target.value)}
              placeholder="Outro? Escreva aqui"
              aria-label={`${p.pergunta}: outro`}
              maxLength={600}
            />
          )}
          {hoje[p.chave] && (
            <p className="pergunta-hoje">
              No dossiê hoje: <q>{hoje[p.chave]?.replace(/\.$/, "")}</q>. Marque as opções para trocar; sem marcar, fica
              como está.
            </p>
          )}
        </fieldset>
      );
    }
    return (
      <label key={p.chave} className="pergunta" htmlFor={id}>
        <span className="pergunta-titulo">{p.pergunta}</span>
        {p.tipo === "area" ? (
          <textarea
            id={id}
            className="input"
            rows={3}
            value={r[p.chave]}
            onChange={(e) => mudar(p.chave, e.target.value)}
            placeholder={p.dica}
            maxLength={4000}
          />
        ) : (
          <input
            id={id}
            className="input"
            value={r[p.chave]}
            onChange={(e) => mudar(p.chave, e.target.value)}
            placeholder={p.dica}
            inputMode={p.tipo === "valor" ? "decimal" : undefined}
            maxLength={p.tipo === "valor" ? 200 : 600}
          />
        )}
      </label>
    );
  }

  return (
    <form className="formulario-dossie" onSubmit={salvar}>
      {temDossie && (
        <p className="aviso">
          As respostas já vêm do dossiê atual. Campo em branco não apaga nada do que está escrito; a rotina dia a dia, a
          SWOT e a leitura da conta ficam como estão.
        </p>
      )}

      {BLOCOS_DO_DOSSIE.map((bloco, i) => (
        <section key={bloco.titulo} className="card bloco-form" aria-labelledby={`bloco-${i}`}>
          <h2 id={`bloco-${i}`}>{bloco.titulo}</h2>
          {bloco.perguntas.map((p, j) =>
            Array.isArray(p) ? (
              <div key={j} className="lado-a-lado">
                {p.map(campoDe)}
              </div>
            ) : (
              campoDe(p)
            )
          )}
        </section>
      ))}

      <div className="barra-salvar">
        <button type="submit" className="btn btn-primario" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar dossiê"}
        </button>
        <Link href={`/clientes/${encodeURIComponent(slug)}`} className="btn btn-secundario">
          Cancelar
        </Link>
        <span role="status" className={erro ? "erro-inline" : "muted pequeno"}>
          {erro ?? (sujo ? "Respostas ainda não salvas." : "")}
        </span>
      </div>
    </form>
  );
}
