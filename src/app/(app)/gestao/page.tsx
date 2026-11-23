import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestao } from "@/lib/auth/sessao";
import { obterContexto } from "@/lib/hub/contexto";
import { MigracaoPendenteError, type ClienteRow, clientesComDossie, diretorioAssessores, listarClientes } from "@/lib/data/hub";
import { listarAssessoresAtivos, listarUsuarios, mesReferenciaPadrao, statusDoMes } from "@/lib/data/repo";
import { resumirCarteira } from "@/lib/hub/exigencia";
import { AvisoMigracao, EmBreve, PaginaTopo } from "@/components/hub/basicos";
import { Barra, rotuloMes } from "@/components/ui";

const SITUACAO: Record<string, { rotulo: string; tom: string }> = {
  equilibrada: { rotulo: "Equilibrada", tom: "ok" },
  "quase-completa": { rotulo: "Quase completa", tom: "atencao" },
  completa: { rotulo: "Completa", tom: "acento" },
  "sem-nivel": { rotulo: "Nível a definir", tom: "" },
};

export default async function GestaoPage() {
  const sessao = await exigirGestao();
  const ctx = await obterContexto();
  if (ctx?.modo === "assessor") redirect("/inicio");

  const mesRef = mesReferenciaPadrao();
  const [assessores, statusMes, usuarios] = await Promise.all([
    listarAssessoresAtivos().catch(() => []),
    statusDoMes(mesRef).catch(() => null),
    sessao.papel === "diretoria" ? listarUsuarios().catch(() => []) : Promise.resolve([]),
  ]);
  const aguardando = usuarios.filter((u) => !u.ativo).length;

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

  return (
    <>
      <PaginaTopo
        rotulo={sessao.cargo ?? (sessao.papel === "diretoria" ? "Diretoria" : "Coordenação")}
        titulo="Visão geral"
        lede={
          sessao.papel === "coordenacao"
            ? "A operação da sua carteira de assessores."
            : "A operação inteira: carteiras, dossiês e o plano de carreira."
        }
      />

      {migracaoPendente && <AvisoMigracao />}

      <div className="grade-metricas quatro">
        <Link href="/clientes" className="card metrica">
          <span className="rotulo">Clientes ativos</span>
          <b className="metrica-num">{ativos.length}</b>
          <span className="metrica-nota">{assessores.length} assessores</span>
        </Link>
        <Link href="/clientes" className="card metrica">
          <span className="rotulo">Pedem atenção</span>
          <b className="metrica-num acento">{atencao.length}</b>
          <span className="metrica-nota">marcados pela coordenação</span>
        </Link>
        <Link href="/clientes" className="card metrica">
          <span className="rotulo">Sem dossiê</span>
          <b className="metrica-num">{semDossie.length}</b>
          <span className="metrica-nota">formulário ainda não respondido</span>
        </Link>
        <Link href="/coins/lancar" className="card metrica">
          <span className="rotulo">Coins · {rotuloMes(mesRef)}</span>
          <b className="metrica-num">{statusMes === "fechada" ? "Fechado" : statusMes === "aberta" ? "Aberto" : "—"}</b>
          <span className="metrica-nota">{statusMes === "fechada" ? "apuração fechada" : "lançar e fechar o mês"}</span>
        </Link>
      </div>

      {(semAssessor.length > 0 || aguardando > 0) && (
        <div className="aviso aviso-atencao" style={{ marginTop: 18 }}>
          {semAssessor.length > 0 && (
            <>
              {semAssessor.length === 1 ? "1 cliente sem assessor vinculado" : `${semAssessor.length} clientes sem assessor vinculado`}{" "}
              — <Link href="/clientes" className="btn-link">vincular em Clientes</Link>.{" "}
            </>
          )}
          {aguardando > 0 && (
            <>
              {aguardando === 1 ? "1 pessoa esperando" : `${aguardando} pessoas esperando`} aprovação —{" "}
              <Link href="/gestao/usuarios" className="btn-link">ver Usuários</Link>.
            </>
          )}
        </div>
      )}

      <section className="secao">
        <h2>Carteiras</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Soma da nota de exigência de cada carteira contra o teto do nível: júnior até 85 pontos, pleno até 120, sênior até
          160.
        </p>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="tabela" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Assessor</th>
                  <th>Nível</th>
                  <th style={{ textAlign: "right" }}>Clientes</th>
                  <th style={{ width: "34%" }}>Exigência</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {carteiras.map(({ assessor, nome, clientes: n, atencao: at, resumo }) => (
                  <tr key={assessor.id}>
                    <td style={{ fontWeight: 600 }}>{nome}</td>
                    <td style={{ color: "var(--texto-suave)" }}>{assessor.nivel}</td>
                    <td style={{ textAlign: "right" }}>
                      {n}
                      {at > 0 && <span className="acento-texto"> · {at} ⚑</span>}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <Barra pct={resumo.pct ?? 0} />
                        </div>
                        <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {resumo.pts}
                          {resumo.teto ? ` / ${resumo.teto.pts}` : ""}
                        </span>
                      </div>
                      {(resumo.excede4 || resumo.excede5) && (
                        <div className="erro-inline">Passou do limite de clientes 4★/5★ do nível</div>
                      )}
                    </td>
                    <td>
                      <span className={`chip chip-${SITUACAO[resumo.situacao].tom}`}>{SITUACAO[resumo.situacao].rotulo}</span>
                    </td>
                  </tr>
                ))}
                {carteiras.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Nenhum assessor na sua carteira de coordenação ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="secao">
        <h2>Chega nas próximas fases</h2>
        <div className="grade-3">
          <EmBreve titulo="Saúde dos clientes" fase="fase 4">
            O painel de saúde dentro do Hub, com login: críticos, SLA, sentimento, foco da semana e ranking — filtrado pela
            carteira de cada coordenação.
          </EmBreve>
          <EmBreve titulo="Reuniões e tarefas" fase="fase 3">
            Reuniões realizadas × esperadas por assessor e tarefas em atraso no ClickUp, com a sugestão das metas 3.4 e 3.5
            no Lançar mês.
          </EmBreve>
          <EmBreve titulo="Rotinas cumpridas" fase="fase 2">
            Os ritos da semana de cada cliente viram checklist, e a gestão vê o cumprimento por assessor.
          </EmBreve>
        </div>
      </section>
    </>
  );
}
