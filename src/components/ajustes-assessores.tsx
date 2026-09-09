"use client";

import { useState, useTransition } from "react";
import { atualizarAssessorAction } from "@/app/actions";
import { NIVEIS } from "@/lib/trilhacoins";

interface AssessorEditavel {
  id: string;
  nome: string;
  nivel: string;
  saldoInicial: number;
  ativo: boolean;
}

export function AjustesAssessores({ assessores }: { assessores: AssessorEditavel[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="tabela" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Assessor</th>
              <th>Nível</th>
              <th style={{ textAlign: "right" }}>Saldo inicial</th>
              <th>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {assessores.map((a) => (
              <LinhaAssessor key={a.id} assessor={a} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LinhaAssessor({ assessor }: { assessor: AssessorEditavel }) {
  const [nivel, setNivel] = useState(assessor.nivel);
  const [saldoInicial, setSaldoInicial] = useState(String(assessor.saldoInicial));
  const [ativo, setAtivo] = useState(assessor.ativo);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function salvar(patch: Partial<{ nivel: string; saldoInicial: number; ativo: boolean }>) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await atualizarAssessorAction(assessor.id, patch);
      if (!r.ok) setErro(r.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
      }
    });
  }

  return (
    <tr style={{ opacity: ativo ? 1 : 0.5 }}>
      <td style={{ fontWeight: 600 }}>
        {assessor.nome}
        {erro && <div style={{ fontSize: 11, color: "#c93d18", fontWeight: 400 }}>{erro}</div>}
        {salvo && <div style={{ fontSize: 11, color: "var(--trilha-verde-profundo)", fontWeight: 400 }}>salvo</div>}
      </td>
      <td>
        <select
          className="input"
          value={nivel}
          disabled={pending}
          onChange={(e) => {
            setNivel(e.target.value);
            salvar({ nivel: e.target.value });
          }}
        >
          {NIVEIS.map((n) => (
            <option key={n.codigo} value={n.codigo}>
              {n.nome}
            </option>
          ))}
        </select>
      </td>
      <td style={{ textAlign: "right" }}>
        <input
          type="number"
          className="input"
          style={{ width: 100, textAlign: "right" }}
          value={saldoInicial}
          disabled={pending}
          onChange={(e) => setSaldoInicial(e.target.value)}
          onBlur={() => salvar({ saldoInicial: Number(saldoInicial) || 0 })}
        />
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
