"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { atualizarClienteAction, excluirClienteAction } from "@/app/hub-actions";

const SITUACAO: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  saiu: "Inativo (saiu da Trilha)",
};

/** Inativar ou reativar (gestão) e excluir de vez (só a diretoria). */
export function AcoesDoCliente({
  clienteId,
  slug,
  nome,
  status,
  podeExcluir,
}: {
  clienteId: string;
  slug: string;
  nome: string;
  status: string;
  podeExcluir: boolean;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const inativo = status === "saiu";

  function mudarSituacao() {
    setMsg(null);
    iniciar(async () => {
      const r = await atualizarClienteAction(clienteId, slug, { status: inativo ? "ativo" : "saiu" });
      if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
      else {
        setMsg({ tipo: "ok", texto: inativo ? "Cliente reativado." : "Cliente inativado." });
        router.refresh();
      }
    });
  }

  function excluir() {
    setMsg(null);
    iniciar(async () => {
      const r = await excluirClienteAction(clienteId);
      if (!r.ok) {
        setMsg({ tipo: "erro", texto: r.erro });
        setConfirmando(false);
        return;
      }
      router.push("/clientes");
      router.refresh();
    });
  }

  return (
    <div className="card acoes-cliente">
      <div className="acao-cliente">
        <div>
          <b>Situação: {SITUACAO[status] ?? status}</b>
          <p>
            {inativo
              ? "Reativado, ele volta para a carteira do assessor e para o Início."
              : "Inativo sai da carteira do assessor e do Início, mas o dossiê e o histórico ficam guardados. Ele continua em Clientes, no filtro Pausados e saíram."}
          </p>
        </div>
        <button type="button" className="btn btn-secundario" disabled={pendente} onClick={mudarSituacao}>
          {inativo ? "Reativar cliente" : "Inativar cliente"}
        </button>
      </div>

      {podeExcluir && (
        <div className="acao-cliente">
          <div>
            <b>Excluir de vez</b>
            <p>Para cliente cadastrado por engano. O dossiê, as versões e as liberações somem junto e não dá para desfazer.</p>
          </div>
          {confirmando ? (
            <span className="confirmar-remocao">
              <span>Excluir {nome}?</span>
              <button type="button" className="btn btn-perigo" disabled={pendente} onClick={excluir}>
                {pendente ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button type="button" className="btn-link" disabled={pendente} onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-secundario botao-perigo" disabled={pendente} onClick={() => setConfirmando(true)}>
              <Trash2 strokeWidth={1.6} aria-hidden="true" />
              Excluir cliente
            </button>
          )}
        </div>
      )}

      {msg && (
        <p role="status" className={msg.tipo === "ok" ? "msg-ok" : "erro-inline"}>
          {msg.texto}
        </p>
      )}
    </div>
  );
}
