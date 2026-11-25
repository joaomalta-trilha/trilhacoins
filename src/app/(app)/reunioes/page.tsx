import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import {
  type ClienteRow,
  MigracaoPendenteError,
  diretorioAssessores,
  diretorioPessoas,
  listarClientes,
  listarOpcoesClickUp,
  obterDossiesDe,
} from "@/lib/data/hub";
import { buscarReunioes } from "@/lib/data/clickup";
import { lerDossie, lerFrequencias } from "@/lib/hub/dossie";
import {
  type Reuniao,
  esperadasNoMes,
  mesDe,
  mesVizinho,
  nomeDoMes,
  resumirMes,
  reunioesPorCliente,
  rotuloDaData,
} from "@/lib/hub/reunioes";
import {
  AvisoMigracao,
  Cena,
  Ic,
  PaginaTopo,
  iniciais,
} from "@/components/hub/basicos";
import {
  type LinhaReuniao,
  ReunioesDoMes,
} from "@/components/hub/reunioes-mes";
import { Barra } from "@/components/ui";

export const metadata = { title: "Reuniões" };

const MOTIVO_SEM_LEITURA = {
  "sem-configuracao":
    "A ligação com o ClickUp ainda não foi configurada: falta a chave do ClickUp na Vercel.",
  "chave-recusada":
    "O ClickUp recusou a chave guardada na Vercel. Gere uma chave nova no ClickUp e troque na Vercel.",
  falha:
    "Não deu para ler o ClickUp agora. Tente “Atualizar agora” em alguns minutos.",
} as const;

/**
 * Reuniões com os clientes, mês a mês, lidas da lista 🗣️ Reuniões do
 * ClickUp. A gestão vê todos os clientes ativos; o assessor, a carteira.
 */
export default async function ReunioesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const gestao = ctx.modo === "gestao";

  const agora = new Date();
  const mesAtual = mesDe(agora);
  const primeiro = mesVizinho(mesAtual, -6);
  const ultimo = mesVizinho(mesAtual, 3);
  const { mes: pedido } = await searchParams;
  const mes =
    pedido &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) &&
    pedido >= primeiro &&
    pedido <= ultimo
      ? pedido
      : mesAtual;

  let clientes: ClienteRow[];
  let nomes: Map<string, string>;
  try {
    [clientes, nomes] = await Promise.all([
      listarClientes(),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
    ]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <PaginaTopo titulo="Reuniões" />
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }

  // a gestão olha todos os clientes ativos; o assessor, a própria carteira
  const alvo = ctx.assessorAlvo;
  const daTela = clientes.filter(
    (c) =>
      c.status !== "saiu" && (gestao || (alvo && c.assessorId === alvo.id)),
  );

  const [dossies, leitura, pessoas, opcoes] = await Promise.all([
    obterDossiesDe(daTela.map((c) => c.id)),
    buscarReunioes(agora),
    gestao ? diretorioPessoas().catch(() => []) : Promise.resolve([]),
    gestao ? listarOpcoesClickUp().catch(() => []) : Promise.resolve([]),
  ]);
  const nomeDaPessoa = new Map(pessoas.map((p) => [p.id, p.nome]));

  const reunioes = leitura.ok ? leitura.reunioes : [];
  // o vínculo considera todos os clientes visíveis (um grupo pode ter cliente fora da tela)
  const { porCliente, semCliente } = reunioesPorCliente(reunioes, clientes);

  const linhas: LinhaReuniao[] = daTela.map((c) => {
    const md = dossies.get(c.id) ?? null;
    const frequencia = md ? lerFrequencias(lerDossie(md)).reuniao : null;
    const esperadas = esperadasNoMes(frequencia);
    const r = resumirMes(porCliente.get(c.id) ?? [], mes, esperadas, agora);
    return {
      id: c.id,
      slug: c.slug,
      nome: c.nome,
      iniciais: iniciais(c.nome),
      assessor: c.assessorId ? (nomes.get(c.assessorId) ?? null) : null,
      coordenacao: c.coordenacaoId
        ? (nomeDaPessoa.get(c.coordenacaoId) ?? null)
        : null,
      ligado: !!c.clickupClienteOpcao,
      frequencia: esperadas === null ? null : frequencia,
      esperadas,
      realizadas: r.realizadas,
      agendadas: r.agendadas,
      vencidas: r.vencidas,
      proxima: r.proxima?.data
        ? { data: r.proxima.data, url: r.proxima.url }
        : null,
      ultima: r.ultima?.data
        ? { data: r.ultima.data, url: r.ultima.url }
        : null,
      situacao: r.situacao,
    };
  });

  // conta do mês: só quem tem frequência combinada e vínculo com o ClickUp
  const contadas = linhas.filter((l) => l.ligado && l.esperadas);
  const esperadasNoTotal = contadas.reduce((s, l) => s + (l.esperadas ?? 0), 0);
  const cumpridas = contadas.reduce(
    (s, l) => s + Math.min(l.realizadas, l.esperadas ?? 0),
    0,
  );
  const pct = esperadasNoTotal
    ? Math.round((cumpridas / esperadasNoTotal) * 100)
    : null;

  // reuniões do mês que pedem ação, cada uma uma vez só (um grupo é mais de um cliente)
  const idsDaTela = new Set(daTela.map((c) => c.id));
  const nomeDoCliente = new Map(clientes.map((c) => [c.id, c.nome]));
  const doMes = (r: Reuniao) => r.data && mesDe(new Date(r.data)) === mes;
  const vencidas = new Map<string, { r: Reuniao; clientes: string[] }>();
  for (const [clienteId, lista] of porCliente) {
    if (!idsDaTela.has(clienteId)) continue;
    for (const r of lista) {
      if (r.situacao !== "vencida" || !doMes(r)) continue;
      const atual = vencidas.get(r.id) ?? { r, clientes: [] };
      atual.clientes.push(nomeDoCliente.get(clienteId) ?? "");
      vencidas.set(r.id, atual);
    }
  }
  const listaVencidas = [...vencidas.values()].sort((a, b) =>
    (a.r.data ?? "").localeCompare(b.r.data ?? ""),
  );

  // gestão: reuniões do mês de clientes que o Hub não tem (ou que não estão ligados)
  const nomeDaOpcao = new Map(opcoes.map((o) => [o.id, o.nome]));
  const foraDoHub = new Map<string, number>();
  if (gestao) {
    for (const r of semCliente) {
      if (!doMes(r) || r.situacao === "cancelada") continue;
      const chave =
        (r.opcaoCliente && nomeDaOpcao.get(r.opcaoCliente)) || r.nome;
      foraDoHub.set(chave, (foraDoHub.get(chave) ?? 0) + 1);
    }
  }

  const anterior = mes > primeiro ? mesVizinho(mes, -1) : null;
  const seguinte = mes < ultimo ? mesVizinho(mes, 1) : null;
  const ehMesAtual = mes === mesAtual;
  const tituloMes = nomeDoMes(mes);

  return (
    <Cena>
      <PaginaTopo
        titulo="Reuniões"
        lede={`Reuniões com os clientes${gestao ? "" : " da sua carteira"}, direto da lista 🗣️ Reuniões do ClickUp. A conta compara as reuniões feitas com a frequência combinada no dossiê de cada cliente.`}
        lado={
          leitura.ok && pct !== null ? (
            <div className="card carteira-cartao">
              <div className="card-hd">
                <Ic>
                  <CalendarDays strokeWidth={1.6} />
                </Ic>
                <span className="chip">{tituloMes}</span>
              </div>
              <div className="num grande">
                {cumpridas}
                <small>de {esperadasNoTotal} reuniões esperadas</small>
              </div>
              <Barra pct={pct} />
              <div className="linha-meta">
                <span>{pct}% feitas</span>
                <span>
                  {listaVencidas.length
                    ? `${listaVencidas.length} ${listaVencidas.length === 1 ? "vencida" : "vencidas"}`
                    : ehMesAtual
                      ? "nenhuma vencida"
                      : ""}
                </span>
              </div>
            </div>
          ) : undefined
        }
      >
        <div className="sub-row">
          <nav className="pills sub-pills meses" aria-label="Mês">
            {anterior ? (
              <Link href={`/reunioes?mes=${anterior}`} className="pill">
                <ChevronLeft strokeWidth={1.8} aria-hidden="true" />
                {nomeDoMes(anterior).replace(/ de \d{4}$/, "")}
              </Link>
            ) : null}
            <span className="pill" aria-current="page">
              {tituloMes.replace(/^./, (l) => l.toUpperCase())}
            </span>
            {seguinte ? (
              <Link href={`/reunioes?mes=${seguinte}`} className="pill">
                {nomeDoMes(seguinte).replace(/ de \d{4}$/, "")}
                <ChevronRight strokeWidth={1.8} aria-hidden="true" />
              </Link>
            ) : null}
            {!ehMesAtual && (
              <Link href="/reunioes" className="pill">
                Voltar para este mês
              </Link>
            )}
          </nav>
        </div>
      </PaginaTopo>

      {!leitura.ok && (
        <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
          {MOTIVO_SEM_LEITURA[leitura.motivo]}
          {leitura.motivo === "falha" && leitura.detalhe
            ? ` (${leitura.detalhe})`
            : ""}
        </div>
      )}
      {!gestao && !alvo && (
        <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
          Seu acesso ainda não foi vinculado a um assessor. Peça à diretoria
          para escolher o seu nome em Usuários.
        </div>
      )}

      {/* sem leitura do ClickUp não há o que contar: melhor não mostrar todo mundo como "falta reunião" */}
      {leitura.ok && (
        <ReunioesDoMes
          linhas={linhas}
          gestao={gestao}
          lidasEm={leitura.lidasEm}
        />
      )}

      {listaVencidas.length > 0 && (
        <section className="reunioes-secao" aria-labelledby="t-vencidas">
          <h2 id="t-vencidas">Reuniões vencidas</h2>
          <p className="secao-lede">
            Ainda estão como agendadas no ClickUp, mas o dia já passou. Se a
            reunião aconteceu, marque como concluída; se não, remarque.
          </p>
          <ul className="lista-vencidas">
            {listaVencidas.map(({ r, clientes: doGrupo }) => {
              const { dia, hora } = rotuloDaData(r.data!);
              return (
                <li key={r.id}>
                  <span className="vencida-quando">
                    {dia}
                    {hora && <small> · {hora}</small>}
                  </span>
                  <span className="vencida-quem">
                    <b>{doGrupo.join(", ")}</b>
                    {r.responsaveis.length > 0 && (
                      <small>{r.responsaveis.join(", ")}</small>
                    )}
                  </span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secundario"
                  >
                    Abrir no ClickUp
                    <ExternalLink strokeWidth={1.6} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {foraDoHub.size > 0 && (
        <section className="reunioes-secao" aria-labelledby="t-fora">
          <h2 id="t-fora">Reuniões de quem não está no Hub</h2>
          <p className="secao-lede">
            O campo Clientes dessas reuniões aponta para uma opção que nenhum
            cliente do Hub usa. Se é cliente, cadastre em Novo cliente e ligue
            em <Link href="/clientes/clickup">Vínculo com o ClickUp</Link>.
          </p>
          <div className="chips">
            {[...foraDoHub.entries()]
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
              .map(([nome, n]) => (
                <span key={nome} className="chip chip-borda">
                  {nome} · {n} {n === 1 ? "reunião" : "reuniões"}
                </span>
              ))}
          </div>
        </section>
      )}
    </Cena>
  );
}
