import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Bookmark } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { type ConteudoRow, MigracaoPendenteError, listarConteudos } from "@/lib/data/hub";
import { AvisoMigracao, Cena, Chip, Ic, PaginaTopo, Seta } from "@/components/hub/basicos";

export const metadata = { title: "Trilha do Assessor" };

export default async function TrilhaPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");

  let conteudos: ConteudoRow[];
  try {
    conteudos = await listarConteudos("trilha");
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

  const abertura = conteudos.find((c) => c.slug === "comece-aqui");
  const etapas = conteudos.filter((c) => c.slug !== "comece-aqui");
  const ehDiretoria = ctx.sessao.papel === "diretoria";

  return (
    <Cena>
      <PaginaTopo
        titulo={
          <>
            Trilha do <em>Assessor</em>
          </>
        }
        lede="O caminho de entrada na operação, nesta ordem: quem é a Trilha, como trabalhamos, o que acontece por trás e os Trilha Coins."
      />

      {conteudos.length === 0 && (
        <div className="vazio" style={{ marginTop: 40 }}>
          <b>Nenhum conteúdo publicado ainda</b>
          <p>
            A diretoria importa a Trilha do Assessor pelos arquivos em <code>data/seed/</code>.
          </p>
        </div>
      )}

      <div className="grade-etapas">
        {abertura && (
          <Link href="/trilha/comece-aqui" className="card etapa quente">
            <div className="card-hd">
              <Ic>
                <BookOpen strokeWidth={1.6} />
              </Ic>
              <Seta claro />
            </div>
            <h3>{abertura.titulo || "Comece aqui"}</h3>
            <p>{abertura.resumo || "Leitura obrigatória antes das etapas: recorrência, mentalidade e quem é quem."}</p>
            {!abertura.publicado && ehDiretoria && (
              <div className="chips">
                <Chip tom="atencao">Rascunho</Chip>
              </div>
            )}
          </Link>
        )}
        {etapas.map((c) => {
          const n = c.etapa?.match(/\d+/)?.[0];
          const continuacao = Boolean(n && c.etapa?.includes(" · "));
          return (
            <Link key={c.id} href={`/trilha/${c.slug}`} className={`card etapa${c.publicado ? "" : " rascunho"}`}>
              <div className="card-hd">
                {n ? (
                  <span className="num">
                    {n}
                    <small>{continuacao ? "etapa, continuação" : "etapa"}</small>
                  </span>
                ) : (
                  <Ic>
                    <Bookmark strokeWidth={1.6} />
                  </Ic>
                )}
                <Seta />
              </div>
              <h3>{c.titulo}</h3>
              {c.resumo && <p>{c.resumo}</p>}
              {!c.publicado && ehDiretoria && (
                <div className="chips">
                  <Chip tom="atencao">Rascunho</Chip>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </Cena>
  );
}
