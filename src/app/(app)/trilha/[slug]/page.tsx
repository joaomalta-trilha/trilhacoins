import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, listarConteudos, obterConteudo } from "@/lib/data/hub";
import { AvisoMigracao, Chip } from "@/components/hub/basicos";
import { Md } from "@/components/hub/markdown";

export default async function ConteudoTrilhaPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { slug } = await params;

  let conteudo: Awaited<ReturnType<typeof obterConteudo>>;
  let todos: Awaited<ReturnType<typeof listarConteudos>>;
  try {
    [conteudo, todos] = await Promise.all([obterConteudo(decodeURIComponent(slug)), listarConteudos("trilha")]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) return <AvisoMigracao />;
    throw e;
  }
  if (!conteudo) notFound();

  const sequencia = todos.filter((c) => c.slug !== "comece-aqui");
  const i = sequencia.findIndex((c) => c.id === conteudo.id);
  const anterior = i > 0 ? sequencia[i - 1] : null;
  const proximo = i >= 0 && i < sequencia.length - 1 ? sequencia[i + 1] : null;

  return (
    <article className="conteudo">
      <header className="conteudo-topo">
        <div className="cliente-topo-linha">
          <Link href="/trilha" className="voltar">
            ← Trilha do Assessor
          </Link>
          {ctx.sessao.papel === "diretoria" && (
            <Link href={`/trilha/${conteudo.slug}/editar`} className="btn btn-secundario btn-icone">
              <Pencil size={14} strokeWidth={1.6} aria-hidden="true" /> Editar
            </Link>
          )}
        </div>
        {conteudo.etapa && <p className="rotulo">{conteudo.etapa}</p>}
        <h1>{conteudo.titulo}</h1>
        {conteudo.resumo && <p className="lede">{conteudo.resumo}</p>}
        {!conteudo.publicado && <Chip tom="atencao">Rascunho — só a diretoria vê</Chip>}
      </header>

      <Md texto={conteudo.corpoMd} className="conteudo-corpo" />

      <nav className="conteudo-nav" aria-label="Etapas da Trilha">
        {anterior ? (
          <Link href={`/trilha/${anterior.slug}`} className="card">
            <span className="rotulo">Anterior</span>
            <b>{anterior.titulo}</b>
          </Link>
        ) : (
          <span />
        )}
        {proximo && (
          <Link href={`/trilha/${proximo.slug}`} className="card proximo">
            <span className="rotulo">Próxima</span>
            <b>{proximo.titulo}</b>
          </Link>
        )}
      </nav>
    </article>
  );
}
