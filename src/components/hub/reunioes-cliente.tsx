import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { type Reuniao, type SituacaoReuniao, nomeDoMes, resumirMes, rotuloDaData } from "@/lib/hub/reunioes";

const CHIP: Record<SituacaoReuniao, { texto: string; tom: string }> = {
  realizada: { texto: "Realizada", tom: "chip-ok" },
  agendada: { texto: "Agendada", tom: "chip-borda" },
  vencida: { texto: "Vencida", tom: "chip-acento" },
  cancelada: { texto: "Cancelada", tom: "" },
};

/**
 * Reuniões de um cliente na página dele: o mês contra a frequência do
 * dossiê, a próxima marcada e as últimas, com atalho para o ClickUp.
 */
export function ReunioesDoCliente({
  reunioes,
  esperadas,
  mes,
  agora,
}: {
  reunioes: Reuniao[];
  esperadas: number | null;
  mes: string;
  agora: Date;
}) {
  const r = resumirMes(reunioes, mes, esperadas, agora);
  // a próxima marcada e as cinco mais recentes que já passaram
  const passadas = reunioes
    .filter((x) => x.data && x.situacao !== "agendada")
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))
    .slice(0, 5);
  const lista = r.proxima ? [r.proxima, ...passadas] : passadas;
  const nomeMes = nomeDoMes(mes).replace(/ de \d{4}$/, "");

  return (
    <section className="dossie-secao" aria-labelledby="t-reunioes">
      <h2 id="t-reunioes">Reuniões</h2>
      <p className="reunioes-cliente-resumo">
        <b>
          {r.realizadas}
          {esperadas ? ` de ${esperadas}` : ""}
        </b>{" "}
        {r.realizadas === 1 ? "reunião feita" : "reuniões feitas"} em {nomeMes}
        {esperadas === null ? " (frequência de reunião ainda não combinada no dossiê)" : ""}
        {r.vencidas > 0 && <span className="chip chip-acento">{r.vencidas === 1 ? "1 vencida" : `${r.vencidas} vencidas`}</span>}
      </p>
      {lista.length ? (
        <ul className="reunioes-cliente">
          {lista.map((x) => {
            const { dia, hora } = rotuloDaData(x.data!);
            const chip = CHIP[x.situacao];
            return (
              <li key={x.id}>
                <span className="reuniao-quando">
                  {dia}
                  {hora && <small> · {hora}</small>}
                </span>
                <span className={`chip ${chip.tom}`}>{chip.texto}</span>
                <span className="reuniao-quem">{x.responsaveis.join(", ")}</span>
                <a href={x.url} target="_blank" rel="noreferrer" className="quando-link">
                  Abrir no ClickUp
                  <ExternalLink strokeWidth={1.6} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="secao-lede">Nenhuma reunião deste cliente nos últimos meses na lista de reuniões do ClickUp.</p>
      )}
      <p className="nota-rodape">
        Da lista 🗣️ Reuniões do ClickUp, pelo campo Clientes. Visão do mês inteiro em <Link href="/reunioes">Reuniões</Link>.
      </p>
    </section>
  );
}

/** Para a gestão: o cliente ainda não tem opção do ClickUp, então as reuniões não chegam. */
export function ReunioesSemVinculo() {
  return (
    <section className="dossie-secao" aria-labelledby="t-reunioes">
      <h2 id="t-reunioes">Reuniões</h2>
      <p className="secao-lede">
        Este cliente ainda não está ligado a uma opção do campo Clientes do ClickUp, então as reuniões dele não aparecem aqui.
        Ligue em <Link href="/clientes/clickup">Vínculo com o ClickUp</Link>.
      </p>
    </section>
  );
}
