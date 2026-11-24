import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/auth/sessao";
import { MigracaoPendenteError, diretorioAssessores, listarLiberacoes, obterClientePorSlug } from "@/lib/data/hub";
import { AvisoMigracao, Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";
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
  if (!dados) notFound();
  const { cliente, dossie } = dados;

  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href={`/clientes/${cliente.slug}`}>{cliente.nome}</Voltar>
      </div>
      <PaginaTopo
        titulo={cliente.nome}
        lede="Cadastro, quem pode ler o dossiê e o texto do dossiê. Cada parte tem o seu botão de salvar."
      />

      <section className="editor-secao">
        <h2>Cadastro</h2>
        <CadastroCliente cliente={cliente} assessores={assessores} />
      </section>

      <section className="editor-secao">
        <h2>Quem vê o dossiê</h2>
        <LiberacoesDossie
          cliente={cliente}
          assessores={assessores}
          liberados={liberados}
          podeLiberar={sessao.papel === "diretoria"}
        />
      </section>

      <section className="editor-secao">
        <h2>Dossiê</h2>
        <EditorDossie
          cliente={cliente}
          conteudoInicial={dossie?.conteudoMd ?? `# ${cliente.nome}\n\n- Em uma frase: \n- Objetivo: \n- Meta: \n`}
        />
      </section>
    </Cena>
  );
}
