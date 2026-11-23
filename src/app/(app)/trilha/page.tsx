import Link from "next/link";
import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/hub/contexto";
import { type ConteudoRow, MigracaoPendenteError, listarConteudos } from "@/lib/data/hub";
import { AvisoMigracao, Chip, PaginaTopo } from "@/components/hub/basicos";
import { Md } from "@/components/hub/markdown";

export default async function TrilhaPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");

  let conteudos: ConteudoRow[];
  try {
    conteudos = await listarConteudos("trilha");
  } catch (e) {
    if (e instanceof MigracaoPendenteError) return <AvisoMigracao />;
    throw e;
  }

  const abertura = conteudos.find((c) => c.slug === "comece-aqui");
  const etapas = conteudos.filter((c) => c.slug !== "comece-aqui");
  const ehDiretoria = ctx.sessao.papel === "diretoria";

  return (
    <>
      <PaginaTopo
        rotulo="Processos e cultura"
        titulo={
          <>
            Trilha do <em>Assessor</em>
          </>
        }
        lede="O caminho de entrada na operação, nesta ordem: quem é a Trilha, como trabalhamos, o que acontece por trás e os Trilha Coins."
      />

      {conteudos.length === 0 && (
        <div className="card tom-areia">
          <p className="muted" style={{ margin: 0 }}>
            Nenhum conteúdo publicado ainda. A diretoria importa a Trilha do Assessor pelos arquivos em{" "}
            <code>data/seed/</code>.
          </p>
        </div>
      )}

      <div className="grade-etapas">
        {etapas.map((c, i) => (
          <Link key={c.id} href={`/trilha/${c.slug}`} className={`card etapa${c.publicado ? "" : " rascunho"}`}>
            <span className="etapa-num">{c.etapa ?? i + 1}</span>
            <div>
              <h3>{c.titulo}</h3>
              {c.resumo && <p>{c.resumo}</p>}
              {!c.publicado && ehDiretoria && <Chip tom="atencao">Rascunho</Chip>}
            </div>
          </Link>
        ))}
      </div>

      {abertura && (
        <section className="secao trilha-abertura">
          <Md texto={abertura.corpoMd} />
          {ehDiretoria && (
            <Link href="/trilha/comece-aqui/editar" className="btn-link pequeno">
              Editar esta parte
            </Link>
          )}
        </section>
      )}
    </>
  );
}
