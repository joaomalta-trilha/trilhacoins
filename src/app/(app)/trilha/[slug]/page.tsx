import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, listarConteudos, obterConteudo } from "@/lib/data/hub";
import { AvisoMigracao, Cena, Chip, Seta, Voltar } from "@/components/hub/basicos";
import { Md } from "@/components/hub/markdown";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const conteudo = await obterConteudo(decodeURIComponent(slug)).catch(() => null);
  return { title: conteudo?.titulo ?? "Trilha do Assessor" };
}

export default async function ConteudoTrilhaPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { slug } = await params;

  let conteudo: Awaited<ReturnType<typeof obterConteudo>>;
  let todos: Awaited<ReturnType<typeof listarConteudos>>;
  try {
    [conteudo, todos] = await Promise.all([obterConteudo(decodeURIComponent(slug)), listarConteudos("trilha")]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }
  if (!conteudo) notFound();

  // "Comece por aqui" abre a sequência; as etapas seguem na ordem.
  const sequencia = [...todos.filter((c) => c.slug === "comece-aqui"), ...todos.filter((c) => c.slug !== "comece-aqui")];
  const i = sequencia.findIndex((c) => c.id === conteudo.id);
  const anterior = i > 0 ? sequencia[i - 1] : null;
  const proximo = i >= 0 && i < sequencia.length - 1 ? sequencia[i + 1] : null;

  return (
    <Cena>
      <article className="conteudo">
        <div className="acoes-topo">
          <Voltar href="/trilha">Trilha do Assessor</Voltar>
          {ctx.sessao.papel === "diretoria" && (
            <Link href={`/trilha/${conteudo.slug}/editar`} className="btn btn-secundario">
              <Pencil strokeWidth={1.6} aria-hidden="true" />
              Editar
            </Link>
          )}
        </div>
        <header className="heroi simples">
          <div>
            <h1>{conteudo.titulo}</h1>
            {(conteudo.resumo || conteudo.etapa) && (
              <p className="lede">
                {conteudo.etapa ? `${conteudo.etapa}. ` : ""}
                {conteudo.resumo}
              </p>
            )}
            {!conteudo.publicado && (
              <div className="sub-row">
                <Chip tom="atencao">Rascunho, só a diretoria vê</Chip>
              </div>
            )}
          </div>
        </header>

        <Md texto={conteudo.corpoMd} className="conteudo-corpo" />

        {(anterior || proximo) && (
          <nav className="conteudo-nav" aria-label="Etapas da Trilha">
            {anterior && (
              <Link href={`/trilha/${anterior.slug}`} className="card anterior">
                <div className="card-hd">
                  <span className="btn-circulo" aria-hidden="true">
                    <ArrowLeft strokeWidth={1.8} />
                  </span>
                </div>
                <div className="card-t">
                  {anterior.titulo}
                  <small>Volta para a parte anterior</small>
                </div>
              </Link>
            )}
            {proximo && (
              <Link href={`/trilha/${proximo.slug}`} className="card proximo">
                <div className="card-hd" style={{ justifyContent: "flex-end" }}>
                  <Seta />
                </div>
                <div className="card-t">
                  {proximo.titulo}
                  <small>Próxima parte da Trilha</small>
                </div>
              </Link>
            )}
          </nav>
        )}
      </article>
    </Cena>
  );
}
