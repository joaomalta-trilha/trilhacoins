"use client";

import { useState, useTransition } from "react";
import { atualizarCarteiraAction, atualizarUsuarioAction } from "@/app/actions";
import type { Papel } from "@/lib/auth/sessao";

interface UsuarioEditavel {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  ativo: boolean;
  carteira: string[];
}

const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "diretoria", rotulo: "Diretoria" },
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
            ? "1 pessoa logou e está esperando aprovação de acesso."
            : `${pendentes.length} pessoas logaram e estão esperando aprovação de acesso.`}
        </div>
      )}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tabela" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Assessor(es) vinculado(s)</th>
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
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar(patch: Partial<{ papel: Papel; assessorId: string | null; ativo: boolean }>) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await atualizarUsuarioAction(usuario.id, patch);
      if (!r.ok) setErro(r.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
      }
    });
  }

  function salvarCarteira(novaCarteira: string[]) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await atualizarCarteiraAction(usuario.id, novaCarteira);
      if (!r.ok) setErro(r.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
      }
    });
  }

  return (
    <tr style={{ background: !usuario.ativo && !ativo ? "rgba(238,76,32,0.06)" : undefined }}>
      <td style={{ fontWeight: 600 }}>
        {usuario.email}
        {erro && <div style={{ fontSize: 11, color: "#c93d18", fontWeight: 400 }}>{erro}</div>}
        {salvo && <div style={{ fontSize: 11, color: "var(--trilha-verde-profundo)", fontWeight: 400 }}>salvo</div>}
      </td>
      <td>
        <select
          className="input"
          value={papel}
          disabled={pending}
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
              onChange={(e) => {
                const selecionados = [...e.target.selectedOptions].map((o) => o.value);
                setCarteira(selecionados);
                salvarCarteira(selecionados);
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
          type="checkbox"
          checked={ativo}
          disabled={pending}
          onChange={(e) => {
            setAtivo(e.target.checked);
            salvar({ ativo: e.target.checked });
          }}
        />
      </td>
    </tr>
  );
}
