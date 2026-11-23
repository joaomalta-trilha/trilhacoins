import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, diretorioAssessores, obterClientePorSlug } from "@/lib/data/hub";
import { lerDossie, campo } from "@/lib/hub/dossie";
import { AvisoMigracao, Chip, EmBreve, Estrelas } from "@/components/hub/basicos";
import { DossieView } from "@/components/hub/dossie-view";

export default async function ClientePage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { slug } = await params;

  let dados: Awaited<ReturnType<typeof obterClientePorSlug>>;
  let nomes: Map<string, string>;
  try {
    [dados, nomes] = await Promise.all([
      obterClientePorSlug(decodeURIComponent(slug)),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
    ]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) return <AvisoMigracao />;
    throw e;
  }
  // O RLS devolve "nada" tanto para cliente inexistente quanto para dossiê
  // não liberado: as duas viram 404, sem confirmar que o cliente existe.
  if (!dados) notFound();
  const { cliente, dossie } = dados;

  const podeEditar = ctx.sessao.papel !== "assessor";
  const assessor = cliente.assessorId ? nomes.get(cliente.assessorId) : null;
  const frase = dossie ? campo(lerDossie(dossie.conteudoMd), "Em uma frase") || cliente.frase : cliente.frase;
  const ehDaCarteira = ctx.assessorAlvo && cliente.assessorId === ctx.assessorAlvo.id;

  return (
    <>
      <header className="cliente-topo">
        <div className="cliente-topo-linha">
          <Link href="/clientes" className="voltar">
            ← {ctx.modo === "gestao" ? "Clientes" : "Minha carteira"}
          </Link>
          {podeEditar && (
            <Link href={`/clientes/${cliente.slug}/editar`} className="btn btn-secundario btn-icone">
              <Pencil size={14} strokeWidth={1.6} aria-hidden="true" /> Editar
            </Link>
          )}
        </div>
        <p className="rotulo">
          {assessor ? `Assessor: ${assessor}` : "Sem assessor vinculado"}
          {cliente.squad ? ` · Squad ${cliente.squad}` : ""}
        </p>
        <h1>{cliente.nome}</h1>
        {frase && <p className="lede">{frase}</p>}
        <div className="chips">
          {cliente.exigenciaPts !== null && (
            <Chip>
              <Estrelas pts={cliente.exigenciaPts} comPontos />
            </Chip>
          )}
          {cliente.pacote && <Chip>{cliente.pacote}</Chip>}
          {cliente.status !== "ativo" && <Chip tom="escuro">{cliente.status === "pausado" ? "Pausado" : "Saiu"}</Chip>}
          {cliente.pedeAtencao && <Chip tom="acento">Pede atenção</Chip>}
          {cliente.pilotoAssistente && <Chip tom="atencao">Piloto do Claudinho</Chip>}
          {ctx.modo === "assessor" && !ehDaCarteira && <Chip tom="ok">Liberado pela gestão</Chip>}
        </div>
      </header>

      {/audiovisual/i.test(cliente.pacote ?? "") && (
        <div className="card tom-areia faixa-av">
          <b>🎥 Cliente com audiovisual: 4 vídeos gravados a cada 30 dias.</b> No começo de cada ciclo, combine o roteiro
          com o cliente e as datas de gravação com o filmmaker, pela lista 🎥 Áudio-visual do ClickUp.
        </div>
      )}

      {dossie ? (
        <DossieView cliente={cliente} md={dossie.conteudoMd} />
      ) : (
        <div className="card tom-areia">
          <h3>Dossiê ainda não respondido</h3>
          <p className="muted">
            O dossiê sai quando a coordenação responder o formulário desse cliente.
            {podeEditar && " Você pode escrever direto em Editar → Dossiê."}
          </p>
        </div>
      )}

      {ehDaCarteira || ctx.modo === "gestao" ? (
        <div className="grade-2" style={{ marginTop: 28 }}>
          <EmBreve titulo="Tarefas e reuniões" fase="fase 3">
            Tarefas abertas e atrasadas no ClickUp e as reuniões realizadas e agendadas deste cliente, direto da lista 🗣️
            Reuniões.
          </EmBreve>
          <EmBreve titulo="Grupo de WhatsApp" fase="fase 4">
            Mensagens esperando resposta, insatisfações abertas e o termômetro do grupo, vindos do painel de saúde.
          </EmBreve>
        </div>
      ) : null}

      {dossie && (
        <p className="nota-rodape">
          Dossiê versão {dossie.versao} · atualizado em{" "}
          {new Date(dossie.atualizadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}
        </p>
      )}
    </>
  );
}
