"use client";

import { useState, useTransition } from "react";
import { atualizarCarteiraAction, atualizarUsuarioAction } from "@/app/actions";
import { atualizarPessoaAction } from "@/app/hub-actions";
import type { Papel } from "@/lib/auth/sessao";

interface UsuarioEditavel {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  ativo: boolean;
  carteira: string[];
  nome: string | null;
  cargo: string | null;
  clickupUserId: number | null;
}

// O gestor entra como "Diretoria": mesmos acessos. O cargo é o que
// aparece no Hub ("Gerente de Performance", "Diretor", "Coordenadora").
const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "diretoria", rotulo: "Diretoria / Gestão" },
  { valor: "coordenacao", rotulo: "Coordenação" },
  { valor: "assessor", rotulo: "Assessor" },
];

export function AjustesUsuarios({
  usuarios,
  assessores,
}: {
  usuarios: UsuarioEditavel[];
  assessores: { id: string; nome: string }[];
}) {
  const pendentes = usuarios.filter((u) => !u.ativo);

  return (
    <div>
      {pendentes.length > 0 && (
        <div className="aviso aviso-atencao" style={{ marginBottom: 12 }}>
          {pendentes.length === 1
            ? "1 pessoa entrou e está esperando aprovação de acesso."
            : `${pendentes.length} pessoas entraram e estão esperando aprovação de acesso.`}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tabela" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Cargo</th>
                <th>Papel</th>
                <th>Assessor(es) vinculado(s)</th>
                <th>ID no ClickUp</th>
                <th>Ativo</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <LinhaUsuario key={u.id} usuario={u} assessores={assessores} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LinhaUsuario({
  usuario,
  assessores,
}: {
  usuario: UsuarioEditavel;
  assessores: { id: string; nome: string }[];
}) {
  const [papel, setPapel] = useState<Papel>(usuario.papel);
  const [assessorId, setAssessorId] = useState(usuario.assessorId ?? "");
  const [carteira, setCarteira] = useState<string[]>(usuario.carteira);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [nome, setNome] = useState(usuario.nome ?? "");
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [clickup, setClickup] = useState(usuario.clickupUserId ? String(usuario.clickupUserId) : "");
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function executar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
      }
    });
  }

  const salvar = (patch: Partial<{ papel: Papel; assessorId: string | null; ativo: boolean }>) =>
    executar(() => atualizarUsuarioAction(usuario.id, patch));
  const salvarPessoa = (patch: { nome?: string; cargo?: string; clickupUserId?: string }) =>
    executar(() => atualizarPessoaAction(usuario.id, patch));

  return (
    <tr style={{ background: !usuario.ativo && !ativo ? "rgba(238,76,32,0.06)" : undefined }}>
      <td>
        <input
          className="input"
          value={nome}
          placeholder="Nome de exibição"
          aria-label={`Nome de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome !== (usuario.nome ?? "") && salvarPessoa({ nome })}
          style={{ width: 170 }}
        />
        <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 3 }}>{usuario.email}</div>
        {erro && <div className="erro-inline">{erro}</div>}
        {salvo && <div style={{ fontSize: 11, color: "var(--trilha-verde-profundo)" }}>salvo</div>}
      </td>
      <td>
        <input
          className="input"
          value={cargo}
          placeholder="Ex.: Gerente de Performance"
          aria-label={`Cargo de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setCargo(e.target.value)}
          onBlur={() => cargo !== (usuario.cargo ?? "") && salvarPessoa({ cargo })}
          style={{ width: 170 }}
        />
      </td>
      <td>
        <select
          className="input"
          value={papel}
          disabled={pending}
          aria-label={`Papel de ${usuario.email}`}
          onChange={(e) => {
            const novoPapel = e.target.value as Papel;
            setPapel(novoPapel);
            salvar({ papel: novoPapel });
          }}
        >
          {PAPEIS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </td>
      <td>
        {papel === "assessor" && (
          <select
            className="input"
            value={assessorId}
            disabled={pending}
            aria-label={`Assessor vinculado a ${usuario.email}`}
            onChange={(e) => {
              setAssessorId(e.target.value);
              salvar({ assessorId: e.target.value === "" ? null : e.target.value });
            }}
          >
            <option value="">— nenhum —</option>
            {assessores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
        {papel === "coordenacao" && (
          <div>
            <select
              className="input"
              multiple
              size={Math.min(4, assessores.length || 1)}
              value={carteira}
              disabled={pending}
              aria-label={`Carteira de ${usuario.email}`}
              onChange={(e) => {
                const selecionados = [...e.target.selectedOptions].map((o) => o.value);
                setCarteira(selecionados);
                executar(() => atualizarCarteiraAction(usuario.id, selecionados));
              }}
              style={{ minWidth: 180 }}
            >
              {assessores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 2 }}>
              Ctrl/Cmd+clique para selecionar vários
            </div>
          </div>
        )}
        {papel === "diretoria" && <span style={{ color: "var(--texto-suave)" }}>— vê todo mundo —</span>}
      </td>
      <td>
        <input
          className="input"
          value={clickup}
          inputMode="numeric"
          placeholder="Ex.: 12345678"
          aria-label={`ID do ClickUp de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setClickup(e.target.value.replace(/\D/g, ""))}
          onBlur={() =>
            clickup !== (usuario.clickupUserId ? String(usuario.clickupUserId) : "") &&
            salvarPessoa({ clickupUserId: clickup })
          }
          style={{ width: 110 }}
        />
      </td>
      <td>
        <input
          type="checkbox"
          checked={ativo}
          disabled={pending}
          aria-label={`Acesso de ${usuario.email} ativo`}
          onChange={(e) => {
            setAtivo(e.target.checked);
            salvar({ ativo: e.target.checked });
          }}
        />
      </td>
    </tr>
  );
}
