"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verComoAction } from "@/app/hub-actions";

/** Coordenação/diretoria em "ver como assessor": escolhe de quem é a visão. */
export function SeletorVerComo({
  opcoes,
  selecionadoId,
}: {
  opcoes: { id: string; nome: string }[];
  selecionadoId: string | null;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (opcoes.length === 0) return null;

  return (
    <div className="sub-row">
      <label className="select-pill">
        <span>Vendo como</span>
        <select
          className="input pill-select"
          value={selecionadoId ?? ""}
          disabled={pendente}
          aria-busy={pendente || undefined}
          onChange={(e) => {
            const id = e.target.value;
            setErro(null);
            iniciar(async () => {
              const r = await verComoAction(id);
              if (!r.ok) setErro(r.erro);
              else router.refresh();
            });
          }}
        >
          {opcoes.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </label>
      {erro && <span className="erro-inline">{erro}</span>}
    </div>
  );
}
