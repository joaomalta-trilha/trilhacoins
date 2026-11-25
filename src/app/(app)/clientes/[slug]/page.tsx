import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, Pencil, Video } from "lucide-react";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, diretorioAssessores, obterClientePorSlug } from "@/lib/data/hub";
import { lerDossie, lerFrequencias, campo } from "@/lib/hub/dossie";
import { buscarReunioes } from "@/lib/data/clickup";
import { esperadasNoMes, mesDe } from "@/lib/hub/reunioes";
import { ReunioesDoCliente, ReunioesSemVinculo } from "@/components/hub/reunioes-cliente";
import { AvisoMigracao, Cena, Chip, EmBreve, Estrelas, Faixa, PaginaTopo, Voltar } from "@/components/hub/basicos";
import { Ancoras } from "@/components/hub/ancoras";
import { DossieAnalise, DossieEssencial, DossieRotina, partesDoDossie } from "@/components/hub/dossie-view";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dados = await obterClientePorSlug(decodeURIComponent(slug)).catch(() => null);
  return { title: dados?.cliente.nome ?? "Cliente" };
}

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
  // O RLS devolve "nada" tanto para cliente inexistente quanto para dossiê
  // não liberado: as duas viram 404, sem confirmar que o cliente existe.
  if (!dados) notFound();
  const { cliente, dossie } = dados;

  const podeEditar = ctx.sessao.papel !== "assessor";
  const assessor = cliente.assessorId ? nomes.get(cliente.assessorId) : null;
  const d = dossie ? lerDossie(dossie.conteudoMd) : null;
  const frase = (d && campo(d, "Em uma frase")) || cliente.frase;
  const ehDaCarteira = ctx.assessorAlvo && cliente.assessorId === ctx.assessorAlvo.id;
  const audiovisual = /audiovisual/i.test(cliente.pacote ?? "");
  const mostrarEmBreve = ehDaCarteira || ctx.modo === "gestao";

  // reuniões do ClickUp (cache de 10 minutos, o mesmo da tela Reuniões)
  const agora = new Date();
  const leitura = await buscarReunioes(agora);
  const reunioesBloco = !leitura.ok ? null : cliente.clickupClienteOpcao ? (
    <ReunioesDoCliente
      reunioes={leitura.reunioes.filter((r) => r.opcaoCliente === cliente.clickupClienteOpcao)}
      esperadas={esperadasNoMes(d ? lerFrequencias(d).reuniao : null)}
      mes={mesDe(agora)}
      agora={agora}
      hrefMes={ctx.modo === "gestao" ? "/reunioes" : "/assessoria#reunioes"}
    />
  ) : ctx.modo === "gestao" ? (
    <ReunioesSemVinculo />
  ) : null;

  const emBreve = mostrarEmBreve ? (
    <section className="dossie-secao" aria-labelledby="t-breve">
      <h2 id="t-breve">Chega nas próximas fases</h2>
      <div className="grade-2">
        <EmBreve titulo="Tarefas do ClickUp" fase="fase 3">
          Tarefas abertas e atrasadas deste cliente no ClickUp, com o atalho para cada uma.
        </EmBreve>
        <EmBreve titulo="Grupo de WhatsApp" fase="fase 4">
          Mensagens esperando resposta, insatisfações abertas e o termômetro do grupo, vindos do painel de saúde.
        </EmBreve>
      </div>
    </section>
  ) : null;

  return (
    <>
      <Cena>
        <div className="acoes-topo">
          <Voltar href="/clientes">{ctx.modo === "gestao" ? "Clientes" : "Minha carteira"}</Voltar>
          {podeEditar && (
            <div className="acoes-botoes">
              <Link href={`/clientes/${cliente.slug}/dossie`} className="btn btn-primario">
                <ClipboardList strokeWidth={1.6} aria-hidden="true" />
                Preencher dossiê
              </Link>
              <Link href={`/clientes/${cliente.slug}/editar`} className="btn btn-secundario">
                <Pencil strokeWidth={1.6} aria-hidden="true" />
                Editar
              </Link>
            </div>
          )}
        </div>

        <PaginaTopo
          titulo={cliente.nome}
          lede={frase || undefined}
          lado={
            <div className="fatos">
              <div className="fato">
                <span>Assessor</span>
                <b>{assessor ?? "Sem assessor"}</b>
              </div>
              <div className="fato">
                <span>Squad</span>
                <b>{cliente.squad ?? "—"}</b>
              </div>
              <div className="fato">
                <span>Nota de exigência</span>
                <b>
                  {cliente.exigenciaPts !== null ? `${cliente.exigenciaPts} pts` : "—"}{" "}
                  <Estrelas pts={cliente.exigenciaPts} />
                </b>
              </div>
              <div className="fato">
                <span>Pacote</span>
                <b>{cliente.pacote?.replace(/\s*\+\s*Audiovisual/i, "") ?? "—"}</b>
              </div>
            </div>
          }
        >
          {(cliente.status !== "ativo" ||
            cliente.pedeAtencao ||
            cliente.pilotoAssistente ||
            audiovisual ||
            (ctx.modo === "assessor" && !ehDaCarteira)) && (
            <div className="chips cliente-chips">
              {cliente.status !== "ativo" && <Chip tom="escuro">{cliente.status === "pausado" ? "Pausado" : "Saiu"}</Chip>}
              {cliente.pedeAtencao && <Chip tom="acento">Pede atenção</Chip>}
              {audiovisual && (
                <Chip>
                  <Video strokeWidth={1.6} aria-hidden="true" />
                  Audiovisual
                </Chip>
              )}
              {cliente.pilotoAssistente && <Chip tom="atencao">Piloto do Claudinho</Chip>}
              {ctx.modo === "assessor" && !ehDaCarteira && <Chip tom="ok">Liberado pela gestão</Chip>}
            </div>
          )}
        </PaginaTopo>

        {audiovisual && (
          <div className="faixa-aviso">
            <Video strokeWidth={1.6} aria-hidden="true" style={{ width: 18, height: 18, flex: "none", marginTop: 1 }} />
            <span>
              <b>Cliente com audiovisual: 4 vídeos gravados a cada 30 dias.</b> No começo de cada ciclo, combine o roteiro
              com o cliente e as datas de gravação com o filmmaker, pela lista de audiovisual do ClickUp.
            </span>
          </div>
        )}
      </Cena>

      {d && dossie ? (
        <>
          <Ancoras itens={partesDoDossie(d)} />
          <Cena>
            <DossieEssencial d={d} md={dossie.conteudoMd} />
          </Cena>
          <Faixa meio rotulo="Rotina da semana">
            <DossieRotina d={d} cliente={cliente} />
          </Faixa>
          <Cena>
            {reunioesBloco}
            <DossieAnalise d={d} />
            {emBreve}
            <p className="nota-rodape" style={{ marginTop: 40 }}>
              Dossiê versão {dossie.versao}, atualizado em{" "}
              {new Date(dossie.atualizadoEm).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}.
            </p>
          </Cena>
        </>
      ) : (
        <Cena>
          <div className="vazio" style={{ marginTop: 40 }}>
            <b>Dossiê ainda não respondido</b>
            <p>
              {podeEditar
                ? "Responda o formulário do dossiê: são as perguntas de sempre da coordenação, aqui dentro do Hub."
                : "O dossiê aparece aqui quando a coordenação responder o formulário desse cliente."}
            </p>
            {podeEditar && (
              <Link href={`/clientes/${cliente.slug}/dossie`} className="btn btn-primario" style={{ marginTop: 8 }}>
                <ClipboardList strokeWidth={1.6} aria-hidden="true" />
                Preencher o dossiê
              </Link>
            )}
          </div>
          {reunioesBloco}
          {emBreve}
        </Cena>
      )}
    </>
  );
}
