"use client";

import { useState, useTransition } from "react";
import { efetivarPromocaoAction } from "@/app/actions";
import { Tag } from "./ui";
import { rotuloMes } from "./ui";

export function SituacaoPromocao({
  assessorId,
  custoProximaTransicao,
  aptoPorSaldo,
  aptoParaPromover,
  requisitoMacro,
  ehCheckpointAgora,
  proximoCheckpointReal,
}: {
  assessorId: string;
  custoProximaTransicao: number | null;
  aptoPorSaldo: boolean;
  aptoParaPromover: boolean;
  requisitoMacro: string | null;
  ehCheckpointAgora: boolean;
  proximoCheckpointReal: string;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  if (custoProximaTransicao === null) return <Tag texto="Partner" cor="var(--trilha-verde-grafite)" />;
  if (!aptoPorSaldo) return <Tag texto="Acumulando" cor="var(--texto-suave)" />;

  if (!aptoParaPromover) {
    return (
      <div>
        <Tag texto="Saldo ok, com pendência" cor="var(--acento)" />
        {requisitoMacro && (
          <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 4 }}>{requisitoMacro}</div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Tag texto="Apto a promover" cor="var(--trilha-verde-profundo)" />
      {ehCheckpointAgora ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setErro(null);
            startTransition(async () => {
              const r = await efetivarPromocaoAction(assessorId);
              if (!r.ok) setErro(r.erro);
            });
          }}
          className="btn-link"
          style={{ display: "block", marginTop: 4, fontWeight: 600, color: "var(--acento)" }}
        >
          {pending ? "Efetivando…" : "Efetivar promoção"}
        </button>
      ) : (
        <div style={{ fontSize: 11, color: "var(--texto-suave)", marginTop: 4 }}>
          efetiva em {rotuloMes(proximoCheckpointReal)}
        </div>
      )}
      {erro && <div style={{ fontSize: 11, color: "#c93d18", marginTop: 4 }}>{erro}</div>}
    </div>
  );
}
