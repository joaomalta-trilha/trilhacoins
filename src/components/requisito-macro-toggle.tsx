"use client";

import { useState, useTransition } from "react";
import { marcarRequisitoMacroAction } from "@/app/actions";

export function RequisitoMacroToggle({
  assessorId,
  nivel,
  descricao,
  atendido,
}: {
  assessorId: string;
  nivel: string;
  descricao: string;
  atendido: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [marcado, setMarcado] = useState(atendido);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 4,
        background: marcado ? "rgba(143,176,138,0.15)" : "var(--bg)",
        border: `1px solid ${marcado ? "var(--trilha-verde-confirmacao)" : "var(--borda)"}`,
      }}
    >
      <input
        type="checkbox"
        checked={marcado}
        disabled={pending}
        onChange={(e) => {
          const novoValor = e.target.checked;
          const anterior = marcado;
          setMarcado(novoValor);
          setErro(null);
          startTransition(async () => {
            const r = await marcarRequisitoMacroAction(assessorId, nivel, novoValor);
            if (!r.ok) {
              setErro(r.erro);
              setMarcado(anterior);
            }
          });
        }}
        style={{ marginTop: 2 }}
      />
      <div>
        <div style={{ fontSize: 13 }}>{descricao}</div>
        <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 2 }}>
          Pré-requisito qualitativo de {nivel} — saldo suficiente não efetiva a promoção sozinho (§5.4).
          Marcado pela diretoria.
        </div>
        {erro && <div style={{ fontSize: 11, color: "#c93d18", marginTop: 4 }}>{erro}</div>}
      </div>
    </div>
  );
}
