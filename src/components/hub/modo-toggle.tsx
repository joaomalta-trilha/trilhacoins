"use client";

import { useOptimistic, useTransition } from "react";
import { trocarModoAction } from "@/app/hub-actions";
import type { Modo } from "@/lib/hub/navegacao";

/**
 * Troca de experiência (Gestão | Assessor) para quem tem papel de gestão.
 * O indicador desliza na hora; a ação grava o cookie e leva para a
 * página inicial da experiência escolhida.
 */
export function ModoToggle({ modo }: { modo: Modo }) {
  const [atual, setAtual] = useOptimistic(modo);
  const [pendente, iniciar] = useTransition();

  function escolher(novo: Modo) {
    if (novo === atual || pendente) return;
    iniciar(async () => {
      setAtual(novo);
      await trocarModoAction(novo);
    });
  }

  return (
    <div className="modo" data-modo={atual} role="group" aria-label="Experiência do Hub" aria-busy={pendente || undefined}>
      <span className="modo-ind" aria-hidden="true" />
      <button type="button" aria-pressed={atual === "gestao"} onClick={() => escolher("gestao")}>
        Gestão
      </button>
      <button type="button" aria-pressed={atual === "assessor"} onClick={() => escolher("assessor")}>
        Assessor
      </button>
    </div>
  );
}
