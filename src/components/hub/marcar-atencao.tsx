"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarClienteAction } from "@/app/hub-actions";

/**
 * "Pede atenção" na página do cliente, para a gestão: um interruptor ao lado
 * dos botões do topo. Muda na hora e confirma no servidor; se o servidor
 * recusar (cliente fora da carteira da coordenação, por exemplo), volta e diz
 * o motivo.
 */
export function MarcarAtencao({
  id,
  slug,
  nome,
  pedeAtencao,
}: {
  id: string;
  slug: string;
  nome: string;
  pedeAtencao: boolean;
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [local, setLocal] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // o servidor manda o valor novo depois de salvar: o valor local some
  const [base, setBase] = useState(pedeAtencao);
  if (base !== pedeAtencao) {
    setBase(pedeAtencao);
    setLocal(null);
  }
  const ligado = local ?? pedeAtencao;

  function mudar(novo: boolean) {
    setErro(null);
    setLocal(novo);
    iniciar(async () => {
      const r = await atualizarClienteAction(id, slug, { pedeAtencao: novo });
      if (!r.ok) {
        setLocal(null);
        setErro(`Não deu para mudar o aviso de ${nome}: ${r.erro}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <label
        className="atencao-pilula"
        title={ligado ? "Desmarcar: deixa de pedir atenção" : "Marcar que pede atenção"}
      >
        <input
          type="checkbox"
          role="switch"
          className="interruptor"
          checked={ligado}
          aria-label="Pede atenção"
          onChange={(e) => mudar(e.target.checked)}
        />
        Pede atenção
      </label>
      <span role="status" className={erro ? "erro-inline atencao-erro" : "sr-only"}>
        {erro ?? ""}
      </span>
    </>
  );
}
