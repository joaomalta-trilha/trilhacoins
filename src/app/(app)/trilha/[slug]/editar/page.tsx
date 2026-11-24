import { notFound } from "next/navigation";
import { exigirDiretoria } from "@/lib/auth/sessao";
import { MigracaoPendenteError, obterConteudo } from "@/lib/data/hub";
import { AvisoMigracao, Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";
import { EditorConteudo } from "@/components/hub/conteudo-editor";

export default async function EditarConteudoPage({ params }: { params: Promise<{ slug: string }> }) {
  await exigirDiretoria();
  const { slug } = await params;

  let conteudo: Awaited<ReturnType<typeof obterConteudo>>;
  try {
    conteudo = await obterConteudo(decodeURIComponent(slug));
  } catch (e) {
    if (e instanceof MigracaoPendenteError)
      return (
        <Cena>
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    throw e;
  }
  if (!conteudo) notFound();

  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href={conteudo.slug === "comece-aqui" ? "/trilha" : `/trilha/${conteudo.slug}`}>{conteudo.titulo}</Voltar>
      </div>
      <PaginaTopo titulo={conteudo.titulo} lede="Editar esta parte da Trilha do Assessor. O texto é Markdown." />
      <section className="editor-secao">
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
      </section>
    </Cena>
  );
}
