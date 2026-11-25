import { notFound } from "next/navigation";
import { exigirGestao } from "@/lib/auth/sessao";
import { MigracaoPendenteError, obterClientePorSlug } from "@/lib/data/hub";
import { respostasDoDossie } from "@/lib/hub/formulario-dossie";
import { AvisoMigracao, Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";
import { FormularioDossie } from "@/components/hub/formulario-dossie";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await obterClientePorSlug(decodeURIComponent(slug)).catch(() => null);
  return { title: dados ? `Dossiê de ${dados.cliente.nome}` : "Dossiê" };
}

export default async function PreencherDossiePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  await exigirGestao();
  const [{ slug }, { novo }] = await Promise.all([params, searchParams]);

  let dados: Awaited<ReturnType<typeof obterClientePorSlug>>;
  try {
    dados = await obterClientePorSlug(decodeURIComponent(slug));
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
  if (!dados) notFound();
  const { cliente, dossie } = dados;
  const { respostas, hoje } = respostasDoDossie(dossie?.conteudoMd ?? null, cliente.status);

  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href={`/clientes/${cliente.slug}`}>{cliente.nome}</Voltar>
      </div>
      <PaginaTopo
        titulo={`Dossiê de ${cliente.nome}`}
        lede={
          novo === "1"
            ? "Cliente criado. Agora responda o que souber: dá para salvar e completar depois."
            : dossie
              ? "As mesmas perguntas do formulário da coordenação, já marcadas com o que está no dossiê. Confirme ou corrija."
              : "As mesmas perguntas do formulário da coordenação. Responda o que souber: dá para salvar e completar depois."
        }
      />
      <div style={{ marginTop: 36 }}>
        <FormularioDossie clienteId={cliente.id} slug={cliente.slug} inicial={respostas} hoje={hoje} temDossie={!!dossie} />
      </div>
    </Cena>
  );
}
