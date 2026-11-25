import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { type ContaDoGrupo, type ReuniaoVencida, nomeDoMes, rotuloDaData } from "@/lib/hub/reunioes";
import { Ic } from "./basicos";
import { Barra } from "@/components/ui";

// Partes das telas de reuniões que a gestão (Reuniões) e o assessor
// (Assessoria) usam do mesmo jeito.

const MOTIVO_SEM_LEITURA = {
  "sem-configuracao": "A ligação com o ClickUp ainda não foi configurada: falta a chave do ClickUp na Vercel.",
  "chave-recusada": "O ClickUp recusou a chave guardada na Vercel. Gere uma chave nova no ClickUp e troque na Vercel.",
  falha: "Não deu para ler o ClickUp agora. Tente “Atualizar agora” em alguns minutos.",
} as const;

export function AvisoLeituraClickUp({ motivo, detalhe }: { motivo: keyof typeof MOTIVO_SEM_LEITURA; detalhe?: string }) {
  return (
    <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
      {MOTIVO_SEM_LEITURA[motivo]}
      {motivo === "falha" && detalhe ? ` (${detalhe})` : ""}
    </div>
  );
}

const semAno = (mes: string) => nomeDoMes(mes).replace(/ de \d{4}$/, "");

/** ‹ outubro · Novembro de 2026 · dezembro › */
export function NavMeses({
  caminho,
  ancora = "",
  mes,
  mesAtual,
  anterior,
  seguinte,
}: {
  caminho: string;
  /** "#reunioes" para voltar à seção certa da página */
  ancora?: string;
  mes: string;
  mesAtual: string;
  anterior: string | null;
  seguinte: string | null;
}) {
  return (
    <nav className="pills sub-pills meses" aria-label="Mês">
      {anterior ? (
        <Link href={`${caminho}?mes=${anterior}${ancora}`} className="pill">
          <ChevronLeft strokeWidth={1.8} aria-hidden="true" />
          {semAno(anterior)}
        </Link>
      ) : null}
      <span className="pill" aria-current="page">
        {nomeDoMes(mes).replace(/^./, (l) => l.toUpperCase())}
      </span>
      {seguinte ? (
        <Link href={`${caminho}?mes=${seguinte}${ancora}`} className="pill">
          {semAno(seguinte)}
          <ChevronRight strokeWidth={1.8} aria-hidden="true" />
        </Link>
      ) : null}
      {mes !== mesAtual && (
        <Link href={`${caminho}${ancora}`} className="pill">
          Voltar para este mês
        </Link>
      )}
    </nav>
  );
}

/** Cartão "18 de 49 clientes com reunião", com as reuniões esperadas e as vencidas embaixo. */
export function CartaoReunioesDoMes({
  conta,
  mes,
  esperadas,
  cumpridas,
  vencidas,
  ehMesAtual,
}: {
  conta: ContaDoGrupo;
  mes: string;
  esperadas: number;
  cumpridas: number;
  vencidas: number;
  ehMesAtual: boolean;
}) {
  const pctClientes = conta.clientes ? Math.round((conta.comReuniao / conta.clientes) * 100) : 0;
  const pct = esperadas ? Math.round((cumpridas / esperadas) * 100) : null;
  return (
    <div className="card carteira-cartao">
      <div className="card-hd">
        <Ic>
          <CalendarDays strokeWidth={1.6} />
        </Ic>
        <span className="chip">{nomeDoMes(mes)}</span>
      </div>
      <div className="num grande">
        {conta.comReuniao}
        <small>
          de {conta.clientes} {conta.clientes === 1 ? "cliente" : "clientes"} com reunião
        </small>
      </div>
      <Barra pct={pctClientes} />
      <div className="linha-meta">
        <span>
          {pct !== null
            ? `${cumpridas} de ${esperadas} reuniões esperadas (${pct}%)`
            : `${conta.reunioes} ${conta.reunioes === 1 ? "reunião feita" : "reuniões feitas"}`}
        </span>
        <span>
          {vencidas ? `${vencidas} ${vencidas === 1 ? "vencida" : "vencidas"}` : ehMesAtual ? "nenhuma vencida" : ""}
        </span>
      </div>
    </div>
  );
}

/** Reuniões que passaram do dia e continuam como agendadas no ClickUp. */
export function ListaVencidas({ vencidas }: { vencidas: ReuniaoVencida[] }) {
  if (!vencidas.length) return null;
  return (
    <section className="reunioes-secao" aria-labelledby="t-vencidas">
      <h2 id="t-vencidas">Reuniões vencidas</h2>
      <p className="secao-lede">
        Ainda estão como agendadas no ClickUp, mas o dia já passou. Se a reunião aconteceu, marque como concluída; se não,
        remarque.
      </p>
      <ul className="lista-vencidas">
        {vencidas.map(({ reuniao: r, clientes }) => {
          const { dia, hora } = rotuloDaData(r.data!);
          return (
            <li key={r.id}>
              <span className="vencida-quando">
                {dia}
                {hora && <small> · {hora}</small>}
              </span>
              <span className="vencida-quem">
                <b>{clientes.join(", ")}</b>
                {r.responsaveis.length > 0 && <small>{r.responsaveis.join(", ")}</small>}
              </span>
              <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-secundario">
                Abrir no ClickUp
                <ExternalLink strokeWidth={1.6} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** As contas do cartão, a partir das linhas da tela. */
export function contasDoCartao(linhas: { ligado: boolean; esperadas: number | null; realizadas: number }[]) {
  const contadas = linhas.filter((l) => l.ligado && l.esperadas);
  return {
    esperadas: contadas.reduce((s, l) => s + (l.esperadas ?? 0), 0),
    cumpridas: contadas.reduce((s, l) => s + Math.min(l.realizadas, l.esperadas ?? 0), 0),
  };
}
