import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import {
  type ClienteRow,
  MigracaoPendenteError,
  clientesComDossie,
  diretorioAssessores,
  listarClientes,
  listarTodasLiberacoes,
} from "@/lib/data/hub";
import { listarAssessoresAtivos } from "@/lib/data/repo";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { AvisoMigracao, Cena, Ic, PaginaTopo, iniciais } from "@/components/hub/basicos";
import { type CartaoCliente, type Filtro, type GrupoClientes, ListaClientes } from "@/components/hub/lista-clientes";
import { SeletorVerComo } from "@/components/hub/ver-como";
import { Barra } from "@/components/ui";

export const metadata = { title: "Clientes" };

const FILTROS_VALIDOS: Filtro[] = ["todos", "atencao", "sem-dossie", "sem-assessor", "pausados"];

const ROTULO_SITUACAO: Record<string, string> = {
  equilibrada: "equilibrada para o nível",
  "quase-completa": "perto do limite do nível",
  completa: "completa para o nível",
  "sem-nivel": "nível a definir",
};

function cartao(c: ClienteRow, comDossie: Set<string>): CartaoCliente {
  return {
    slug: c.slug,
    nome: c.nome,
    iniciais: iniciais(c.nome),
    frase: c.frase || c.objetivo,
    pacote: c.pacote,
    status: c.status,
    pts: c.exigenciaPts,
    pedeAtencao: c.pedeAtencao,
    piloto: c.pilotoAssistente,
    temDossie: comDossie.has(c.id),
    abertoATodos: c.dossieAbertoATodos,
  };
}

/** Quem pede atenção primeiro, depois por nome. */
const ordem = (a: ClienteRow, b: ClienteRow) => Number(b.pedeAtencao) - Number(a.pedeAtencao) || a.nome.localeCompare(b.nome);

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { filtro } = await searchParams;
  const filtroInicial = FILTROS_VALIDOS.includes(filtro as Filtro) ? (filtro as Filtro) : "todos";

  let clientes: ClienteRow[];
  let comDossie: Set<string>;
  let nomes: Map<string, string>;
  let liberacoes: { clienteId: string; assessorId: string }[];
  try {
    [clientes, comDossie, nomes, liberacoes] = await Promise.all([
      listarClientes(),
      clientesComDossie(),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
      listarTodasLiberacoes(),
    ]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <PaginaTopo titulo={ctx.modo === "gestao" ? "Clientes" : "Minha carteira"} />
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }

  // ---------------- experiência do assessor ----------------
  if (ctx.modo === "assessor") {
    const alvo = ctx.assessorAlvo;
    const meus = clientes.filter((c) => alvo && c.assessorId === alvo.id && c.status !== "saiu").sort(ordem);
    const liberadosIds = new Set(liberacoes.filter((l) => l.assessorId === alvo?.id).map((l) => l.clienteId));
    const liberados = clientes
      .filter((c) => c.assessorId !== alvo?.id && (c.dossieAbertoATodos || liberadosIds.has(c.id)))
      .sort(ordem);
    const resumo = resumirCarteira(meus.map((c) => c.exigenciaPts), alvo?.nivel);
    const atencao = meus.filter((c) => c.pedeAtencao).length;

    const grupos: GrupoClientes[] = [
      {
        chave: "minha",
        titulo: alvo && ctx.sessao.papel !== "assessor" ? `Carteira de ${alvo.nome}` : "Sua carteira",
        subtitulo: `${meus.length} ${meus.length === 1 ? "cliente" : "clientes"}, quem pede atenção primeiro`,
        clientes: meus.map((c) => cartao(c, comDossie)),
      },
    ];
    if (liberados.length) {
      grupos.push({
        chave: "liberados",
        titulo: "Liberados pela gestão",
        subtitulo: "Dossiês de outras carteiras que a gestão abriu para você",
        clientes: liberados.map((c) => cartao(c, comDossie)),
      });
    }

    return (
      <Cena>
        <PaginaTopo
          titulo="Minha carteira"
          lede="Um dossiê por cliente: objetivo, meta, contatos, atalhos para as contas, rotina da semana, cuidados e a análise da conta."
          lado={
            <div className="card carteira-cartao">
              <div className="card-hd">
                <Ic>
                  <Briefcase strokeWidth={1.6} />
                </Ic>
                {alvo?.nivel && <span className="chip">{alvo.nivel}</span>}
              </div>
              <div className="num grande">
                {resumo.pts}
                <small>{resumo.teto ? `de ${resumo.teto.pts} pontos de exigência` : "pontos de exigência"}</small>
              </div>
              {resumo.teto && (
                <div className={`sit-${resumo.situacao}`}>
                  <Barra pct={resumo.pct ?? 0} />
                </div>
              )}
              <div className="linha-meta">
                <span>
                  {meus.length} {meus.length === 1 ? "cliente" : "clientes"}
                  {atencao ? ` · ${atencao} ${atencao === 1 ? "pede" : "pedem"} atenção` : ""}
                </span>
                <span>Carteira {ROTULO_SITUACAO[resumo.situacao]}</span>
              </div>
            </div>
          }
        >
          <SeletorVerComo opcoes={ctx.opcoesVerComo} selecionadoId={alvo?.id ?? null} />
        </PaginaTopo>
        {!alvo && (
          <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
            Seu acesso está liberado, mas ainda não foi vinculado a um assessor. Peça à diretoria para escolher o seu nome
            em Usuários.
          </div>
        )}
        <ListaClientes grupos={grupos} mostrarGestao={false} filtroInicial={filtroInicial} />
      </Cena>
    );
  }

  // ---------------- experiência da gestão ----------------
  const assessores = await listarAssessoresAtivos().catch(() => []);
  const nivelDe = new Map(assessores.map((a) => [a.id, a.nivel]));
  const porAssessor = new Map<string, ClienteRow[]>();
  const semAssessor: ClienteRow[] = [];
  for (const c of clientes) {
    if (!c.assessorId) semAssessor.push(c);
    else porAssessor.set(c.assessorId, [...(porAssessor.get(c.assessorId) ?? []), c]);
  }

  const grupos: GrupoClientes[] = [...porAssessor.entries()]
    .map(([assessorId, lista]) => {
      const ativos = lista.filter((c) => c.status !== "saiu");
      const nivel = nivelDe.get(assessorId) ?? null;
      const r = resumirCarteira(ativos.map((c) => c.exigenciaPts), nivel);
      const squads = [...new Set(lista.map((c) => c.squad).filter(Boolean))];
      return {
        chave: assessorId,
        titulo: nomes.get(assessorId) ?? "Assessor",
        subtitulo: `${ativos.length} ${ativos.length === 1 ? "cliente ativo" : "clientes ativos"}${squads.length ? ` · Squad ${squads.join(", ")}` : ""}`,
        carteira: { pts: r.pts, teto: r.teto?.pts ?? null, pct: r.pct, situacao: r.situacao, nivel },
        clientes: [...lista].sort(ordem).map((c) => cartao(c, comDossie)),
      };
    })
    .sort((a, b) => a.titulo.localeCompare(b.titulo));

  if (semAssessor.length) {
    const importados = [...new Set(semAssessor.map((c) => c.assessorImportado).filter(Boolean))];
    grupos.unshift({
      chave: "sem-assessor",
      titulo: "Sem assessor vinculado",
      subtitulo: importados.length
        ? `Vieram da importação como: ${importados.join(", ")}. Abra o cliente e escolha o assessor.`
        : "Abra o cliente e escolha o assessor.",
      clientes: semAssessor.sort(ordem).map((c) => cartao(c, comDossie)),
    });
  }

  const ativos = clientes.filter((c) => c.status === "ativo").length;
  const pendentes = clientes.filter((c) => !comDossie.has(c.id)).length;

  return (
    <Cena>
      <PaginaTopo
        titulo="Clientes"
        lede={`${ativos} clientes ativos e ${pendentes} sem dossiê. Cada carteira mostra a soma da nota de exigência contra o teto do nível do assessor.`}
      >
        <div className="sub-row">
          <Link href="/clientes/novo" className="btn btn-primario">
            <Plus strokeWidth={1.8} aria-hidden="true" />
            Novo cliente
          </Link>
        </div>
      </PaginaTopo>
      <ListaClientes grupos={grupos} mostrarGestao filtroInicial={filtroInicial} />
    </Cena>
  );
}
