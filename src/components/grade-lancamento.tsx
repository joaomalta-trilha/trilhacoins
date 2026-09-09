"use client";

import { useState, useTransition } from "react";
import {
  fecharMesAction,
  lancarMetaAction,
  limparLancamentoAction,
  reabrirMesAction,
} from "@/app/actions";
import {
  METAS,
  type Lancamentos,
  type Meta,
  coinsDaMeta,
  ehCheckpoint,
  totalMes,
  totalRecorrente,
} from "@/lib/trilhacoins";
import { fmt, rotuloMes } from "./ui";
import { SeletorMes } from "./seletor-mes";

interface Assessor {
  id: string;
  nome: string;
  nivel: string;
}

export function GradeLancamento({
  assessores,
  mes,
  meses,
  lancamentosIniciais,
  status,
  ehDiretoria,
}: {
  assessores: Assessor[];
  mes: string;
  meses: string[];
  lancamentosIniciais: Record<string, Lancamentos>;
  status: "aberta" | "fechada" | "sem-apuracao";
  /** reabrir mês e editar lançamento de mês fechado são só diretoria (§7) — o RLS do banco também barra isso. */
  ehDiretoria: boolean;
}) {
  const [dados, setDados] = useState<Record<string, Lancamentos>>(lancamentosIniciais);
  const [erro, setErro] = useState<string | null>(null);
  const [pendingMes, startTransitionMes] = useTransition();

  const fechado = status === "fechada";
  const editavel = ehDiretoria || !fechado;

  function setValor(assessorId: string, metaCodigo: string, valor: string) {
    const anterior = dados[assessorId]?.[metaCodigo];
    setDados((d) => ({
      ...d,
      [assessorId]: { ...(d[assessorId] ?? {}), [metaCodigo]: valor === "" ? undefined : valor },
    }));
    setErro(null);
    lancarMetaAction({ assessorId, mes, metaCodigo, valor }).then((r) => {
      if (!r.ok) {
        setErro(r.erro);
        setDados((d) => ({
          ...d,
          [assessorId]: { ...(d[assessorId] ?? {}), [metaCodigo]: anterior },
        }));
      }
    });
  }

  function limparAssessor(assessorId: string, nome: string) {
    if (!window.confirm(`Apagar os lançamentos de ${nome} em ${rotuloMes(mes)}?`)) return;
    const anterior = dados[assessorId];
    setDados((d) => ({ ...d, [assessorId]: {} }));
    limparLancamentoAction(assessorId, mes).then((r) => {
      if (!r.ok) {
        setErro(r.erro);
        setDados((d) => ({ ...d, [assessorId]: anterior }));
      }
    });
  }

  function alternarFechamento() {
    startTransitionMes(async () => {
      const r = fechado ? await reabrirMesAction(mes) : await fecharMesAction(mes);
      if (!r.ok) setErro(r.erro);
    });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 10 }}>
            Apuração de {rotuloMes(mes)}
            {ehCheckpoint(mes) && (
              <span style={{ color: "var(--acento)", fontSize: 13, fontWeight: 400 }}>
                mês de checkpoint
              </span>
            )}
          </h2>
          <div style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 3 }}>
            {fechado
              ? `Mês fechado — os assessores já enxergam ${rotuloMes(mes)}.`
              : "Aberto · as alterações salvam sozinhas."}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {(!fechado || ehDiretoria) && (
            <button
              type="button"
              className={fechado ? "btn btn-secundario" : "btn btn-primario"}
              disabled={pendingMes}
              onClick={alternarFechamento}
            >
              {pendingMes ? "Aguarde…" : fechado ? "Reabrir mês" : "Fechar mês"}
            </button>
          )}
          <SeletorMes meses={meses} mesAtual={mes} rotulo="Mês" />
        </div>
      </div>

      {erro && (
        <div className="aviso aviso-erro" style={{ marginTop: 12 }}>
          {erro}
        </div>
      )}

      {fechado && (
        <div className="aviso aviso-atencao" style={{ marginTop: 12 }}>
          {ehDiretoria
            ? 'Mês fechado. Para editar um lançamento, clique em "Reabrir mês" — a alteração muda o saldo já divulgado ao assessor (fica registrada no log).'
            : "Mês fechado. Peça a reabertura à diretoria para corrigir um lançamento."}
        </div>
      )}

      <div className="card" style={{ marginTop: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tabela" style={{ minWidth: 1050, fontSize: "12.5px" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, background: "var(--trilha-verde-grafite)", minWidth: 150 }}>
                  Assessor
                </th>
                {METAS.map((m) => (
                  <th key={m.codigo} style={{ minWidth: 118 }}>
                    <span style={{ opacity: 0.6 }}>{m.codigo}</span> {m.nome}
                  </th>
                ))}
                <th style={{ textAlign: "right", minWidth: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {assessores.map((a) => {
                const l = dados[a.id] ?? {};
                return (
                  <tr key={a.id}>
                    <td style={{ position: "sticky", left: 0, background: "inherit", fontWeight: 600 }}>
                      {a.nome}
                      <div style={{ fontSize: 11, color: "var(--texto-suave)", fontWeight: 400 }}>{a.nivel}</div>
                      {editavel && Object.keys(l).length > 0 && (
                        <button
                          type="button"
                          onClick={() => limparAssessor(a.id, a.nome)}
                          title={`Apagar os lançamentos de ${rotuloMes(mes)}`}
                          className="btn-secundario"
                          style={{
                            marginTop: 6,
                            borderRadius: 3,
                            padding: "2px 7px",
                            fontSize: 11,
                            fontWeight: 400,
                          }}
                        >
                          Limpar mês
                        </button>
                      )}
                    </td>
                    {METAS.map((m) => (
                      <td key={m.codigo}>
                        <CampoMeta
                          meta={m}
                          valor={l[m.codigo]}
                          onChange={(v) => setValor(a.id, m.codigo, v)}
                          travado={!editavel}
                        />
                      </td>
                    ))}
                    <td style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "var(--texto-forte)" }}>{fmt(totalMes(METAS, l))}</div>
                      <div style={{ fontSize: 11, color: "var(--texto-suave)" }}>
                        {Math.round((totalRecorrente(METAS, l) / 1300) * 100)}% da base
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CampoMeta({
  meta,
  valor,
  onChange,
  travado,
}: {
  meta: Meta;
  valor: string | number | undefined | null;
  onChange: (valor: string) => void;
  travado: boolean;
}) {
  const coins = coinsDaMeta(meta, valor);
  const nota = (
    <div
      style={{
        fontSize: 11,
        color: coins > 0 ? "var(--acento)" : "var(--trilha-verde-nevoa)",
        marginTop: 2,
      }}
    >
      {coins > 0 ? `+${fmt(coins)}` : "0"}
    </div>
  );

  if (travado) {
    return (
      <div>
        <div style={{ fontSize: 13 }}>
          {valor === undefined || valor === null || valor === ""
            ? "—"
            : meta.tipo === "percentual"
              ? `${valor}%`
              : valor}
        </div>
        {nota}
      </div>
    );
  }

  if (meta.tipo === "escala") {
    return (
      <div>
        <select
          className="input"
          value={(valor as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="">—</option>
          {meta.faixas.map((f) => (
            <option key={f.rotulo} value={f.rotulo}>
              {f.rotulo}
            </option>
          ))}
        </select>
        {nota}
      </div>
    );
  }

  if (meta.tipo === "percentual") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number"
            min={0}
            max={100}
            className="input"
            value={valor ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: 60 }}
            placeholder="—"
          />
          <span style={{ color: "var(--texto-suave)" }}>%</span>
        </div>
        {nota}
      </div>
    );
  }

  if (meta.tipo === "contagem") {
    return (
      <div>
        <input
          type="number"
          min={0}
          className="input"
          value={valor ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 60 }}
          placeholder="0"
        />
        {nota}
      </div>
    );
  }

  return (
    <div>
      <input
        type="number"
        min={0}
        step={50}
        className="input"
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 70 }}
        placeholder="coins"
      />
      {nota}
    </div>
  );
}
