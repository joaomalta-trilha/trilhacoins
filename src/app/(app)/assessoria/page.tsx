import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import {
  type ClienteRow,
  MigracaoPendenteError,
  clientesComDossie,
  diretorioAssessores,
  listarClientes,
} from "@/lib/data/hub";
import { listarAssessoresAtivos } from "@/lib/data/repo";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { AvisoMigracao, Cena, PaginaTopo, iniciais } from "@/components/hub/basicos";
import { type CartaoCliente, type Filtro, type GrupoClientes, ListaClientes } from "@/components/hub/lista-clientes";
import { AssessoriaDoAssessor } from "./do-assessor";

export const metadata = { title: "Assessoria" };

const FILTROS_VALIDOS: Filtro[] = ["todos", "atencao", "sem-dossie", "sem-assessor", "pausados"];

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

/**
 * Assessoria. Na gestão: as carteiras, assessor por assessor, com a soma da
 * nota de exigência contra o teto do nível (a planilha de controle de todos
 * os clientes fica em Clientes). Na experiência do assessor: a rotina da
 * semana e as reuniões da carteira (./do-assessor.tsx).
 */
export default async function AssessoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; mes?: string }>;
}) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { filtro, mes } = await searchParams;
  // na experiência do assessor, Assessoria é a rotina da semana e as reuniões da carteira
  if (ctx.modo === "assessor") return <AssessoriaDoAssessor ctx={ctx} pedido={mes} />;
  const filtroInicial = FILTROS_VALIDOS.includes(filtro as Filtro) ? (filtro as Filtro) : "todos";

  let clientes: ClienteRow[];
  let comDossie: Set<string>;
  let nomes: Map<string, string>;
  try {
    [clientes, comDossie, nomes] = await Promise.all([
      listarClientes(),
      clientesComDossie(),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
    ]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <PaginaTopo titulo="Assessoria" />
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }

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
        titulo="Assessoria"
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
