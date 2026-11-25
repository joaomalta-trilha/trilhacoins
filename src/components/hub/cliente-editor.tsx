"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarClienteAction, definirLiberacoesAction, salvarDossieAction } from "@/app/hub-actions";
import type { ChaveLink, ClienteRow, StatusCliente } from "@/lib/data/hub";
import { estrelasDaExigencia } from "@/lib/hub/exigencia";
import { Md } from "./markdown";

type Resultado = { ok: true } | { ok: false; erro: string };

function useSalvar() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const salvar = (acao: () => Promise<Resultado>, ok = "Salvo.") => {
    setMsg(null);
    iniciar(async () => {
      const r = await acao();
      if (r.ok) {
        setMsg({ tipo: "ok", texto: ok });
        router.refresh();
      } else setMsg({ tipo: "erro", texto: r.erro });
    });
  };
  return { pendente, msg, salvar };
}

function Mensagem({ msg }: { msg: { tipo: "ok" | "erro"; texto: string } | null }) {
  if (!msg) return null;
  return (
    <span role="status" className={msg.tipo === "ok" ? "msg-ok" : "erro-inline"}>
      {msg.texto}
    </span>
  );
}

const LINKS: [ChaveLink, string][] = [
  ["relatorio", "Task do relatório (📊 Relatórios)"],
  ["otimizacao", "Task de otimização (📈 Otimizações)"],
  ["checkin", "Check-in do assessor (▶️ Check-in's)"],
  ["recorrencia", "Mensagens em Feedback (💬 Feedback)"],
  ["funil", "Funil de vendas do site"],
];

/** Cadastro do cliente: assessor, status, pacote, nota de exigência, atalhos. */
export function CadastroCliente({
  cliente,
  assessores,
}: {
  cliente: ClienteRow;
  assessores: { id: string; nome: string }[];
}) {
  const { pendente, msg, salvar } = useSalvar();
  const [f, setF] = useState({
    nome: cliente.nome,
    status: cliente.status,
    assessorId: cliente.assessorId ?? "",
    squad: cliente.squad ?? "",
    pacote: cliente.pacote ?? "",
    nicho: cliente.nicho ?? "",
    frase: cliente.frase ?? "",
    objetivo: cliente.objetivo ?? "",
    pedeAtencao: cliente.pedeAtencao,
    exigenciaPts: cliente.exigenciaPts === null ? "" : String(cliente.exigenciaPts),
    links: { ...cliente.links } as Partial<Record<ChaveLink, string>>,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const pts = f.exigenciaPts === "" ? null : Number(f.exigenciaPts);
  const estrelas = estrelasDaExigencia(pts);

  return (
    <form
      className="card form-grade"
      onSubmit={(e) => {
        e.preventDefault();
        salvar(() =>
          atualizarClienteAction(cliente.id, cliente.slug, {
            nome: f.nome,
            status: f.status,
            assessorId: f.assessorId || null,
            squad: f.squad,
            pacote: f.pacote,
            nicho: f.nicho,
            frase: f.frase,
            objetivo: f.objetivo,
            pedeAtencao: f.pedeAtencao,
            exigenciaPts: pts,
            links: f.links,
          })
        );
      }}
    >
      <label>
        <span>Nome</span>
        <input className="input" value={f.nome} onChange={(e) => set("nome", e.target.value)} required maxLength={120} />
      </label>
      <label>
        <span>Status</span>
        <select className="input" value={f.status} onChange={(e) => set("status", e.target.value as StatusCliente)}>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="saiu">Saiu (inativo)</option>
        </select>
      </label>
      <label>
        <span>Assessor</span>
        <select className="input" value={f.assessorId} onChange={(e) => set("assessorId", e.target.value)}>
          <option value="">— sem assessor —</option>
          {assessores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        {!f.assessorId && cliente.assessorImportado && (
          <small className="muted">Veio da importação como “{cliente.assessorImportado}”.</small>
        )}
      </label>
      <label>
        <span>Squad</span>
        <input className="input" value={f.squad} onChange={(e) => set("squad", e.target.value)} placeholder="Nome do squad" maxLength={80} />
      </label>
      <label>
        <span>Pacote</span>
        <input className="input" value={f.pacote} onChange={(e) => set("pacote", e.target.value)} placeholder="Ex.: Criativo sob demanda" maxLength={80} />
      </label>
      <label>
        <span>Nicho</span>
        <input className="input" value={f.nicho} onChange={(e) => set("nicho", e.target.value)} placeholder="Ex.: Imobiliário" maxLength={80} />
      </label>
      <label className="largo">
        <span>Em uma frase</span>
        <input className="input" value={f.frase} onChange={(e) => set("frase", e.target.value)} maxLength={600} />
      </label>
      <label className="largo">
        <span>Objetivo</span>
        <input className="input" value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} maxLength={600} />
      </label>
      <label>
        <span>Nota de exigência (7 a 25)</span>
        <input
          className="input"
          inputMode="numeric"
          value={f.exigenciaPts}
          onChange={(e) => set("exigenciaPts", e.target.value.replace(/\D/g, ""))}
          placeholder="Ex.: 14"
        />
        <small className="muted">{estrelas ? `${estrelas} ${estrelas === 1 ? "estrela" : "estrelas"}` : "Sem nota"}</small>
      </label>
      <label className="check">
        <input type="checkbox" checked={f.pedeAtencao} onChange={(e) => set("pedeAtencao", e.target.checked)} />
        <span>Pede atenção (aparece primeiro na carteira)</span>
      </label>

      <fieldset className="largo">
        <legend>Atalhos para as tasks no ClickUp</legend>
        {LINKS.map(([k, rotulo]) => (
          <label key={k}>
            <span>{rotulo}</span>
            <input
              className="input"
              type="url"
              value={f.links[k] ?? ""}
              placeholder="https://app.clickup.com/t/…"
              onChange={(e) => setF((x) => ({ ...x, links: { ...x.links, [k]: e.target.value } }))}
            />
          </label>
        ))}
      </fieldset>

      <div className="form-acoes largo">
        <button type="submit" className="btn btn-primario" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar cadastro"}
        </button>
        <Mensagem msg={msg} />
      </div>
    </form>
  );
}

/** Dossiê em Markdown, com prévia. Cada alteração guarda a versão anterior. */
export function EditorDossie({ cliente, conteudoInicial }: { cliente: ClienteRow; conteudoInicial: string }) {
  const { pendente, msg, salvar } = useSalvar();
  const [texto, setTexto] = useState(conteudoInicial);
  const [previa, setPrevia] = useState(false);
  const mudou = texto !== conteudoInicial;

  return (
    <div className="card editor-md">
      <div className="editor-barra">
        <div className="abas-mini" role="tablist">
          <button type="button" role="tab" aria-selected={!previa} className={!previa ? "ativo" : ""} onClick={() => setPrevia(false)}>
            Escrever
          </button>
          <button type="button" role="tab" aria-selected={previa} className={previa ? "ativo" : ""} onClick={() => setPrevia(true)}>
            Prévia
          </button>
        </div>
        <span className="muted pequeno">
          Formato: <code># Nome</code>, linhas <code>- Chave: valor</code> e seções <code>## Título</code>
        </span>
      </div>
      {previa ? (
        <Md texto={texto || "_Vazio._"} className="previa" />
      ) : (
        <textarea
          className="input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={24}
          spellCheck
          aria-label={`Dossiê de ${cliente.nome}`}
        />
      )}
      <div className="form-acoes">
        <button
          type="button"
          className="btn btn-primario"
          disabled={pendente || !mudou}
          onClick={() => salvar(() => salvarDossieAction(cliente.id, cliente.slug, texto), "Dossiê salvo. A versão anterior ficou guardada.")}
        >
          {pendente ? "Salvando…" : "Salvar dossiê"}
        </button>
        {mudou && <span className="muted pequeno">Alterações ainda não salvas.</span>}
        <Mensagem msg={msg} />
      </div>
    </div>
  );
}

/** Quem pode ver o dossiê além do assessor da carteira. Só diretoria/gestão altera. */
export function LiberacoesDossie({
  cliente,
  assessores,
  liberados,
  podeLiberar,
}: {
  cliente: ClienteRow;
  assessores: { id: string; nome: string }[];
  liberados: string[];
  podeLiberar: boolean;
}) {
  const { pendente, msg, salvar } = useSalvar();
  const [sel, setSel] = useState<string[]>(liberados);
  const [todos, setTodos] = useState(cliente.dossieAbertoATodos);
  const outros = assessores.filter((a) => a.id !== cliente.assessorId);

  return (
    <div className="card">
      <p className="muted" style={{ marginTop: 0 }}>
        O assessor da carteira sempre vê este dossiê. Para outros assessores, só com liberação da gestão.
      </p>
      <label className="check">
        <input type="checkbox" checked={todos} disabled={!podeLiberar || pendente} onChange={(e) => setTodos(e.target.checked)} />
        <span>
          <b>Liberar para todos os assessores</b>
        </span>
      </label>
      {!todos && (
        <div className="liberacoes">
          {outros.map((a) => (
            <label key={a.id} className="check">
              <input
                type="checkbox"
                checked={sel.includes(a.id)}
                disabled={!podeLiberar || pendente}
                onChange={(e) => setSel((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))}
              />
              <span>{a.nome}</span>
            </label>
          ))}
          {outros.length === 0 && <p className="muted">Nenhum outro assessor ativo.</p>}
        </div>
      )}
      {podeLiberar ? (
        <div className="form-acoes">
          <button
            type="button"
            className="btn btn-primario"
            disabled={pendente}
            onClick={() => salvar(() => definirLiberacoesAction(cliente.id, cliente.slug, todos ? [] : sel, todos))}
          >
            {pendente ? "Salvando…" : "Salvar liberação"}
          </button>
          <Mensagem msg={msg} />
        </div>
      ) : (
        <p className="muted pequeno">Só a diretoria/gestão libera dossiês.</p>
      )}
    </div>
  );
}
