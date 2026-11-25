"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { criarClienteAction } from "@/app/hub-actions";

interface Sugestoes {
  squads: string[];
  pacotes: string[];
  nichos: string[];
}

/** Cadastro do básico; ao salvar, abre o formulário do dossiê do cliente novo. */
export function NovoCliente({
  assessores,
  podeSemAssessor,
  sugestoes,
}: {
  assessores: { id: string; nome: string }[];
  podeSemAssessor: boolean;
  sugestoes: Sugestoes;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState({
    nome: "",
    assessorId: assessores.length === 1 ? assessores[0].id : "",
    status: "ativo",
    squad: "",
    pacote: "",
    nicho: "",
    frase: "",
    exigenciaPts: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!f.assessorId && !podeSemAssessor) {
      setErro("Escolha o assessor do cliente.");
      return;
    }
    iniciar(async () => {
      const r = await criarClienteAction({
        nome: f.nome,
        assessorId: f.assessorId || null,
        status: f.status,
        squad: f.squad,
        pacote: f.pacote,
        nicho: f.nicho,
        frase: f.frase,
        exigenciaPts: f.exigenciaPts ? Number(f.exigenciaPts) : null,
      });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.push(`/clientes/${encodeURIComponent(r.slug)}/dossie?novo=1`);
    });
  }

  return (
    <form className="card form-grade" onSubmit={criar}>
      <label className="largo">
        Nome do cliente
        <input
          className="input"
          value={f.nome}
          onChange={(e) => set("nome", e.target.value)}
          required
          maxLength={120}
          autoFocus
          placeholder="Como aparece no grupo e no ClickUp"
        />
      </label>
      <label>
        Assessor
        <select className="input" value={f.assessorId} onChange={(e) => set("assessorId", e.target.value)}>
          <option value="">{podeSemAssessor ? "Sem assessor por enquanto" : "Escolha o assessor"}</option>
          {assessores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Situação
        <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
        </select>
      </label>
      <label>
        Squad
        <input className="input" list="sugestoes-squad" value={f.squad} onChange={(e) => set("squad", e.target.value)} maxLength={80} />
      </label>
      <label>
        Pacote
        <input
          className="input"
          list="sugestoes-pacote"
          value={f.pacote}
          onChange={(e) => set("pacote", e.target.value)}
          maxLength={80}
          placeholder="Ex.: Criativo sob demanda"
        />
      </label>
      <label>
        Nicho
        <input className="input" list="sugestoes-nicho" value={f.nicho} onChange={(e) => set("nicho", e.target.value)} maxLength={80} />
      </label>
      <label>
        Nota de exigência <small>(7 a 25, se já souber)</small>
        <input
          className="input"
          type="number"
          min={7}
          max={25}
          inputMode="numeric"
          value={f.exigenciaPts}
          onChange={(e) => set("exigenciaPts", e.target.value)}
        />
      </label>
      <label className="largo">
        Em uma frase <small>(o que é o cliente e o que ele quer)</small>
        <textarea className="input" rows={2} value={f.frase} onChange={(e) => set("frase", e.target.value)} maxLength={600} />
      </label>

      <datalist id="sugestoes-squad">
        {sugestoes.squads.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sugestoes-pacote">
        {sugestoes.pacotes.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="sugestoes-nicho">
        {sugestoes.nichos.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="form-acoes largo">
        <button type="submit" className="btn btn-primario" disabled={pendente || !f.nome.trim()}>
          {pendente ? "Criando…" : "Criar e preencher o dossiê"}
        </button>
        {erro && (
          <span role="alert" className="erro-inline">
            {erro}
          </span>
        )}
      </div>
    </form>
  );
}
