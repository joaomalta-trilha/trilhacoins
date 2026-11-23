"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { salvarConteudoAction } from "@/app/hub-actions";
import { Md } from "./markdown";

/** Editor de uma página da Trilha do Assessor (só diretoria — RLS). */
export function EditorConteudo({
  conteudo,
}: {
  conteudo: { id: string; slug: string; titulo: string; resumo: string | null; corpoMd: string; publicado: boolean };
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [titulo, setTitulo] = useState(conteudo.titulo);
  const [resumo, setResumo] = useState(conteudo.resumo ?? "");
  const [corpo, setCorpo] = useState(conteudo.corpoMd);
  const [publicado, setPublicado] = useState(conteudo.publicado);
  const [previa, setPrevia] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function salvar() {
    setMsg(null);
    iniciar(async () => {
      const r = await salvarConteudoAction(conteudo.id, conteudo.slug, { titulo, resumo, corpoMd: corpo, publicado });
      if (r.ok) {
        setMsg({ tipo: "ok", texto: "Salvo." });
        router.refresh();
      } else setMsg({ tipo: "erro", texto: r.erro });
    });
  }

  return (
    <div className="card editor-md form-grade">
      <label className="largo">
        <span>Título</span>
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} />
      </label>
      <label className="largo">
        <span>Resumo (aparece no cartão da etapa)</span>
        <input className="input" value={resumo} onChange={(e) => setResumo(e.target.value)} maxLength={400} />
      </label>
      <div className="largo">
        <div className="editor-barra">
          <div className="abas-mini" role="tablist">
            <button type="button" role="tab" aria-selected={!previa} className={!previa ? "ativo" : ""} onClick={() => setPrevia(false)}>
              Escrever
            </button>
            <button type="button" role="tab" aria-selected={previa} className={previa ? "ativo" : ""} onClick={() => setPrevia(true)}>
              Prévia
            </button>
          </div>
          <span className="muted pequeno">Markdown: ## títulos, - listas, tabelas com |, [link](https://…)</span>
        </div>
        {previa ? (
          <Md texto={corpo || "_Vazio._"} className="previa conteudo-corpo" />
        ) : (
          <textarea className="input" rows={28} value={corpo} onChange={(e) => setCorpo(e.target.value)} aria-label="Conteúdo" />
        )}
      </div>
      <label className="check largo">
        <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} />
        <span>Publicado (todo mundo com acesso vê)</span>
      </label>
      <div className="form-acoes largo">
        <button type="button" className="btn btn-primario" disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        {msg && (
          <span role="status" className={msg.tipo === "ok" ? "msg-ok" : "erro-inline"}>
            {msg.texto}
          </span>
        )}
      </div>
    </div>
  );
}
