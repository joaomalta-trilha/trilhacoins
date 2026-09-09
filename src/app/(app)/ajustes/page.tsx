import { listarAssessores, listarLog, listarPromocoes, listarUsuarios } from "@/lib/data/repo";
import { exigirDiretoria } from "@/lib/auth/sessao";
import { AjustesAssessores } from "@/components/ajustes-assessores";
import { AjustesLog } from "@/components/ajustes-log";
import { AjustesUsuarios } from "@/components/ajustes-usuarios";
import { ExportarJSON } from "@/components/exportar-json";
import { Card, fmt, rotuloMes } from "@/components/ui";

export default async function AjustesPage() {
  await exigirDiretoria();
  const [assessores, promocoes, usuarios, log] = await Promise.all([
    listarAssessores(),
    listarPromocoes(),
    listarUsuarios(),
    listarLog(),
  ]);

  return (
    <>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Usuários</h3>
      <p style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: -4, marginBottom: 8 }}>
        Toda pessoa que loga pela primeira vez aparece aqui inativa. Defina o papel, vincule ao
        assessor correspondente (se for o caso) e marque ativo para liberar o acesso.
      </p>
      <AjustesUsuarios usuarios={usuarios} assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))} />

      <h3 style={{ fontSize: 16, marginTop: 28, marginBottom: 8 }}>Assessores</h3>
      <AjustesAssessores
        assessores={assessores.map((a) => ({
          id: a.id,
          nome: a.nome,
          nivel: a.nivel,
          saldoInicial: a.saldoInicial,
          ativo: a.ativo,
        }))}
      />

      <div style={{ marginTop: 28 }}>
        <Card style={{ maxWidth: 340 }}>
          <div className="rotulo">Exportação</div>
          <p style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: 8, marginBottom: 12 }}>
            Baixa assessores, apurações, lançamentos e promoções em um único JSON.
          </p>
          <ExportarJSON />
        </Card>
      </div>

      <h3 style={{ fontSize: 16, marginTop: 28, marginBottom: 8 }}>Histórico de promoções</h3>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {promocoes.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--texto-suave)", padding: 18 }}>
            Nenhuma promoção efetivada ainda.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Assessor</th>
                  <th>De</th>
                  <th>Para</th>
                  <th style={{ textAlign: "right" }}>Custo</th>
                  <th>Checkpoint</th>
                </tr>
              </thead>
              <tbody>
                {promocoes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.assessorNome}</td>
                    <td style={{ color: "var(--texto-suave)" }}>{p.deNivel}</td>
                    <td style={{ fontWeight: 600 }}>{p.paraNivel}</td>
                    <td style={{ textAlign: "right" }}>{fmt(p.custo)}</td>
                    <td>{rotuloMes(p.checkpoint)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h3 style={{ fontSize: 16, marginTop: 28, marginBottom: 8 }}>Log</h3>
      <p style={{ fontSize: 12, color: "var(--texto-suave)", marginTop: -4, marginBottom: 8 }}>
        Tudo que altera saldo ou permissão (§4). Mostrando os 50 mais recentes.
      </p>
      <AjustesLog entradas={log} />
    </>
  );
}
