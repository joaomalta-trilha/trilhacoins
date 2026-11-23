import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirDiretoria } from "@/lib/auth/sessao";
import { MigracaoPendenteError, obterConteudo } from "@/lib/data/hub";
import { AvisoMigracao } from "@/components/hub/basicos";
import { EditorConteudo } from "@/components/hub/conteudo-editor";

export default async function EditarConteudoPage({ params }: { params: Promise<{ slug: string }> }) {
  await exigirDiretoria();
  const { slug } = await params;

  let conteudo: Awaited<ReturnType<typeof obterConteudo>>;
  try {
    conteudo = await obterConteudo(decodeURIComponent(slug));
  } catch (e) {
    if (e instanceof MigracaoPendenteError) return <AvisoMigracao />;
    throw e;
  }
  if (!conteudo) notFound();

  return (
    <>
      <header className="cliente-topo">
        <Link href={conteudo.slug === "comece-aqui" ? "/trilha" : `/trilha/${conteudo.slug}`} className="voltar">
          ← {conteudo.titulo}
        </Link>
        <p className="rotulo">Trilha do Assessor · editar</p>
        <h1>{conteudo.titulo}</h1>
      </header>
      <EditorConteudo
        conteudo={{
          id: conteudo.id,
          slug: conteudo.slug,
          titulo: conteudo.titulo,
          resumo: conteudo.resumo,
          corpoMd: conteudo.corpoMd,
          publicado: conteudo.publicado,
        }}
      />
    </>
  );
}
