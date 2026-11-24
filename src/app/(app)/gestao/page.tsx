import Link from "next/link";
import { redirect } from "next/navigation";
import { Coins, FileQuestion, Flag, Gauge, UserPlus, UserX, Users } from "lucide-react";
import { exigirGestao } from "@/lib/auth/sessao";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, type ClienteRow, clientesComDossie, diretorioAssessores, listarClientes } from "@/lib/data/hub";
import { listarAssessoresAtivos, listarUsuarios, mesReferenciaPadrao, statusDoMes } from "@/lib/data/repo";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { AvisoMigracao, Cena, Chip, EmBreve, Faixa, Ic, PaginaTopo, Seta } from "@/components/hub/basicos";
import { Barra, rotuloMes } from "@/components/ui";

export const metadata = { title: "Visão geral" };

const SITUACAO: Record<string, { rotulo: string; tom?: "ok" | "atencao" | "acento" }> = {
  equilibrada: { rotulo: "Equilibrada", tom: "ok" },
  "quase-completa": { rotulo: "Quase completa", tom: "atencao" },
  completa: { rotulo: "Completa", tom: "acento" },
  "sem-nivel": { rotulo: "Nível a definir" },
};

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export default async function GestaoPage() {
  const sessao = await exigirGestao();
  const ctx = await obterContexto();
  if (ctx?.modo === "assessor") redirect("/inicio");

  const ehDiretoria = sessao.papel === "diretoria";
  const mesRef = mesReferenciaPadrao();
  const [assessores, statusMes, usuarios] = await Promise.all([
    listarAssessoresAtivos().catch(() => []),
    statusDoMes(mesRef).catch(() => null),
    ehDiretoria ? listarUsuarios().catch(() => []) : Promise.resolve([]),
  ]);
  const aguardando = usuarios.filter((u) => !u.ativo && !u.removidoEm).length;

  let clientes: ClienteRow[] = [];
  let comDossie = new Set<string>();
  let nomes = new Map<string, string>();
  let migracaoPendente = false;
  try {
    [clientes, comDossie, nomes] = await Promise.all([
      listarClientes(),
      clientesComDossie(),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
    ]);
  } catch (e) {
    if (!(e instanceof MigracaoPendenteError)) throw e;
    migracaoPendente = true;
  }

  const ativos = clientes.filter((c) => c.status === "ativo");
  const atencao = ativos.filter((c) => c.pedeAtencao);
  const semDossie = ativos.filter((c) => !comDossie.has(c.id));
  const semAssessor = clientes.filter((c) => !c.assessorId && c.status !== "saiu");

  const carteiras = assessores
    .map((a) => {
      const daCarteira = ativos.filter((c) => c.assessorId === a.id);
      return {
        assessor: a,
        nome: nomes.get(a.id) ?? a.nome,
        clientes: daCarteira.length,
        atencao: daCarteira.filter((c) => c.pedeAtencao).length,
        resumo: resumirCarteira(daCarteira.map((c) => c.exigenciaPts), a.nivel),
      };
    })
    .sort((x, y) => (y.resumo.pct ?? -1) - (x.resumo.pct ?? -1));
  const noLimite = carteiras.filter((c) => c.resumo.situacao === "completa" || c.resumo.situacao === "quase-completa");
  const mesAberto = statusMes !== "fechada";

  return (
    <>
      <Cena>
        <PaginaTopo
          titulo="Visão geral"
          lede={
            sessao.papel === "coordenacao"
              ? "A operação da sua carteira de assessores: clientes, dossiês, carga de cada carteira e o mês do Coins."
              : "A operação inteira: clientes, dossiês, carga de cada carteira e o mês do Coins."
          }
          lado={
            <div className="placar">
              <div>
                <div className="k">Clientes ativos</div>
                <b>{ativos.length}</b>
              </div>
              <small>
                em {plural(carteiras.filter((c) => c.clientes > 0).length, "carteira", "carteiras")}
                <br />
                {plural(assessores.length, "assessor", "assessores")}
              </small>
            </div>
          }
        >
          {(mesAberto || aguardando > 0 || semAssessor.length > 0) && (
            <div className="sub-row">
              {mesAberto && (
                <Link href="/coins/lancar" className="pill sub">
                  <Coins strokeWidth={1.6} aria-hidden="true" />
                  Lançar {rotuloMes(mesRef)}
                </Link>
              )}
              {aguardando > 0 && (
                <Link href="/gestao/usuarios" className="pill sub">
                  <UserPlus strokeWidth={1.6} aria-hidden="true" />
                  Aprovar {plural(aguardando, "pessoa", "pessoas")}
                </Link>
              )}
              {semAssessor.length > 0 && (
                <Link href="/clientes?filtro=sem-assessor" className="pill sub">
                  <UserX strokeWidth={1.6} aria-hidden="true" />
                  Vincular {plural(semAssessor.length, "cliente", "clientes")}
                </Link>
              )}
            </div>
          )}
        </PaginaTopo>

        {migracaoPendente && (
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        )}

        <div className="grade6">
          <Link href="/clientes?filtro=atencao" className="card">
            <div className="card-hd">
              <Ic ponto={atencao.length > 0}>
                <Flag strokeWidth={1.6} />
              </Ic>
              <Seta />
            </div>
            <div className="card-t">
              Pedem atenção
              <small>marcados pela coordenação</small>
            </div>
            <div className="card-ft">
              <span className="num">
                {atencao.length}
                <small>{atencao.length === 1 ? "cliente" : "clientes"}</small>
              </span>
            </div>
          </Link>

          <Link href="/clientes?filtro=sem-dossie" className="card">
            <div className="card-hd">
              <Ic>
                <FileQuestion strokeWidth={1.6} />
              </Ic>
              <Seta />
            </div>
            <div className="card-t">
              Sem dossiê
              <small>formulário ainda não respondido</small>
            </div>
            <div className="card-ft">
              <span className="num">
                {semDossie.length}
                <small>{semDossie.length === 1 ? "cliente" : "clientes"}</small>
              </span>
            </div>
          </Link>

          <Link href="#carteiras" className="card">
            <div className="card-hd">
              <Ic>
                <Gauge strokeWidth={1.6} />
              </Ic>
              <Seta />
            </div>
            <div className="card-t">
              Carteiras no limite
              <small>a partir de 85% do teto do nível</small>
            </div>
            <div className="card-ft">
              <span className="num">
                {noLimite.length}
                <small>de {carteiras.length}</small>
              </span>
            </div>
          </Link>

          <Link href="/coins/lancar" className="card">
            <div className="card-hd">
              <Ic>
                <Coins strokeWidth={1.6} />
              </Ic>
              <Seta />
            </div>
            <div className="card-t">
              Trilha Coins · {rotuloMes(mesRef)}
              <small>{statusMes === "fechada" ? "apuração fechada" : "lançar as metas e fechar o mês"}</small>
            </div>
            <div className="card-ft">
              <span className="num palavra">
                {statusMes === "fechada" ? "Fechado" : statusMes === "aberta" ? "Aberto" : "Sem lançamento"}
              </span>
            </div>
          </Link>

          <Link href="/clientes?filtro=sem-assessor" className="card">
            <div className="card-hd">
              <Ic ponto={semAssessor.length > 0}>
                <UserX strokeWidth={1.6} />
              </Ic>
              <Seta />
            </div>
            <div className="card-t">
              Sem assessor
              <small>{semAssessor.length ? "abra o cliente e escolha o assessor" : "todos os clientes estão vinculados"}</small>
            </div>
            <div className="card-ft">
              <span className="num">
                {semAssessor.length}
                <small>{semAssessor.length === 1 ? "cliente" : "clientes"}</small>
              </span>
            </div>
          </Link>

          {ehDiretoria ? (
            <Link href="/gestao/usuarios" className="card">
              <div className="card-hd">
                <Ic ponto={aguardando > 0}>
                  <UserPlus strokeWidth={1.6} />
                </Ic>
                <Seta />
              </div>
              <div className="card-t">
                Esperando acesso
                <small>entraram e aguardam aprovação</small>
              </div>
              <div className="card-ft">
                <span className="num">
                  {aguardando}
                  <small>{aguardando === 1 ? "pessoa" : "pessoas"}</small>
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/coins/equipe" className="card">
              <div className="card-hd">
                <Ic>
                  <Users strokeWidth={1.6} />
                </Ic>
                <Seta />
              </div>
              <div className="card-t">
                Assessores
                <small>na sua carteira de coordenação</small>
              </div>
              <div className="card-ft">
                <span className="num">{assessores.length}</span>
              </div>
            </Link>
          )}
        </div>
      </Cena>

      <Faixa id="carteiras" rotulo="Carteiras e próximas fases">
        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Carteiras</h2>
            <span className="cnt">
              <b>{carteiras.length}</b>
              {carteiras.length === 1 ? "assessor" : "assessores"}
            </span>
            <p>
              Soma da nota de exigência de cada carteira contra o teto do nível: júnior até 85 pontos, pleno até 120,
              sênior até 160. Clique para abrir os clientes do assessor.
            </p>
          </div>
          {carteiras.length === 0 ? (
            <p className="vazio-escuro">Nenhum assessor na sua carteira de coordenação ainda.</p>
          ) : (
            <div className="ranking">
              {carteiras.map(({ assessor, nome, clientes: n, atencao: at, resumo }, i) => (
                <Link key={assessor.id} href={`/clientes#a-${assessor.id}`} className={`rrow${i === 0 ? " p1" : ""}`}>
                  <span className="pos">{i + 1}</span>
                  <span>
                    <span className="nm">{nome}</span>
                    <span className="nv">
                      {assessor.nivel} · {plural(n, "cliente", "clientes")}
                    </span>
                  </span>
                  <span className="sc">
                    {resumo.pts}
                    <small>{resumo.teto ? `/ ${resumo.teto.pts}` : "pts"}</small>
                  </span>
                  <div className={`medidor sit-${resumo.situacao}`}>
                    <div className="medidor-rotulo">
                      <span>Exigência da carteira</span>
                      <span>{resumo.pct !== null ? `${resumo.pct}%` : "sem teto"}</span>
                    </div>
                    <Barra pct={resumo.pct ?? 0} />
                  </div>
                  <span className="rchips">
                    <Chip tom={SITUACAO[resumo.situacao].tom}>{SITUACAO[resumo.situacao].rotulo}</Chip>
                    {at > 0 && (
                      <Chip tom="acento">
                        {at} {at === 1 ? "pede" : "pedem"} atenção
                      </Chip>
                    )}
                    {(resumo.excede4 || resumo.excede5) && <Chip tom="acento">Acima do limite de 4 e 5 estrelas</Chip>}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="faixa-bloco">
          <div className="secao-cab">
            <h2>Chega nas próximas fases</h2>
          </div>
          <div className="grade-3">
            <EmBreve titulo="Saúde dos clientes" fase="fase 4">
              O painel de saúde dentro do Hub, com login: críticos, SLA, sentimento, foco da semana e ranking, filtrado
              pela carteira de cada coordenação.
            </EmBreve>
            <EmBreve titulo="Reuniões e tarefas" fase="fase 3">
              Reuniões realizadas e esperadas por assessor e tarefas em atraso no ClickUp, com a sugestão das metas 3.4 e
              3.5 no Lançar mês.
            </EmBreve>
            <EmBreve titulo="Rotinas cumpridas" fase="fase 2">
              Os ritos da semana de cada cliente viram checklist, e a gestão vê o cumprimento por assessor.
            </EmBreve>
          </div>
        </div>
      </Faixa>
    </>
  );
}
