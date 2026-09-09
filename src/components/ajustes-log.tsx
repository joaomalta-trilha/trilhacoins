import type { LogRow } from "@/lib/data/types";
import { Card } from "./ui";

const ACOES: Record<string, string> = {
  fechar_mes: "Fechar mês",
  reabrir_mes: "Reabrir mês",
  atualizar_assessor: "Editar assessor",
  marcar_requisito_macro: "Marcar requisito qualitativo",
  efetivar_promocao: "Efetivar promoção",
  atualizar_usuario: "Editar usuário",
};

function fmtDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resumoValores(valor: unknown): string {
  if (valor === null || valor === undefined) return "—";
  if (typeof valor === "object") {
    return Object.entries(valor as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
  }
  return String(valor);
}

export function AjustesLog({ entradas }: { entradas: LogRow[] }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {entradas.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--texto-suave)", padding: 18 }}>
          Nenhum registro ainda.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="tabela">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>Ação</th>
                <th>De</th>
                <th>Para</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDataHora(l.criadoEm)}</td>
                  <td style={{ fontSize: 12 }}>{l.usuarioEmail ?? "—"}</td>
                  <td>{ACOES[l.acao] ?? l.acao}</td>
                  <td style={{ fontSize: 12, color: "var(--texto-suave)", maxWidth: 220 }}>
                    {resumoValores(l.valorAnterior)}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 220 }}>{resumoValores(l.valorNovo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
