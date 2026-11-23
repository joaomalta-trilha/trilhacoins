import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/auth/sessao";
import { MigracaoPendenteError, diretorioAssessores, listarLiberacoes, obterClientePorSlug } from "@/lib/data/hub";
import { AvisoMigracao } from "@/components/hub/basicos";
import { CadastroCliente, EditorDossie, LiberacoesDossie } from "@/components/hub/cliente-editor";

export default async function EditarClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const sessao = await exigirGestao();
  const { slug } = await params;

  let dados: Awaited<ReturnType<typeof obterClientePorSlug>>;
  let assessores: { id: string; nome: string }[];
  let liberados: string[] = [];
  try {
    [dados, assessores] = await Promise.all([obterClientePorSlug(decodeURIComponent(slug)), diretorioAssessores()]);
    if (dados) liberados = await listarLiberacoes(dados.cliente.id);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) return <AvisoMigracao />;
    throw e;
  }
  if (!dados) notFound();
  const { cliente, dossie } = dados;

  return (
    <>
      <header className="cliente-topo">
        <Link href={`/clientes/${cliente.slug}`} className="voltar">
          ← {cliente.nome}
        </Link>
        <p className="rotulo">Gestão · editar cliente</p>
        <h1>{cliente.nome}</h1>
      </header>

      <h2>Cadastro</h2>
      <CadastroCliente cliente={cliente} assessores={assessores} />

      <h2>Quem vê o dossiê</h2>
      <LiberacoesDossie
        cliente={cliente}
        assessores={assessores}
        liberados={liberados}
        podeLiberar={sessao.papel === "diretoria"}
      />

      <h2>Dossiê</h2>
      <EditorDossie cliente={cliente} conteudoInicial={dossie?.conteudoMd ?? `# ${cliente.nome}\n\n- Em uma frase: \n- Objetivo: \n- Meta: \n`} />
    </>
  );
}
