"use client";

import { useState, useTransition } from "react";
import { exportarDadosJSONAction } from "@/app/actions";

export function ExportarJSON() {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function exportar() {
    setErro(null);
    startTransition(async () => {
      const r = await exportarDadosJSONAction();
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      const blob = new Blob([r.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "trilhacoins-dados.json";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <button type="button" className="btn btn-secundario" disabled={pending} onClick={exportar}>
        {pending ? "Exportando…" : "Exportar dados (JSON)"}
      </button>
      {erro && <div style={{ fontSize: 11, color: "#c93d18", marginTop: 6 }}>{erro}</div>}
    </div>
  );
}
