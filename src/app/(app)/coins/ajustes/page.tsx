import Link from "next/link";
import { listarAssessores, listarLog, listarPromocoes, listarUsuarios } from "@/lib/data/repo";
import { exigirDiretoria } from "@/lib/auth/sessao";
import { AjustesAssessores } from "@/components/ajustes-assessores";
import { AjustesLog } from "@/components/ajustes-log";
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
  const pendentes = usuarios.filter((u) => !u.ativo && !u.removidoEm).length;

  return (
    <>
      <div className="aviso" style={{ marginBottom: 20 }}>
        Usuários e papéis agora ficam no Hub, em{" "}
        <Link href="/gestao/usuarios" className="btn-link">
          Gestão → Usuários
        </Link>
        {pendentes > 0 && (
          <strong>
            {" "}
            · {pendentes === 1 ? "1 pessoa esperando" : `${pendentes} pessoas esperando`} aprovação
          </strong>
        )}
        .
      </div>

      <h2 className="coins-h2">Assessores</h2>
      <AjustesAssessores
        assessores={assessores.map((a) => ({
          id: a.id,
          nome: a.nome,
          nivel: a.nivel,
          saldoInicial: a.saldoInicial,
          ativo: a.ativo,
        }))}
      />

      <div style={{ marginTop: 16 }}>
        <Card style={{ maxWidth: 380 }}>
          <div className="card-t" style={{ marginTop: 0 }}>Exportação</div>
          <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: 6, marginBottom: 14 }}>
            Baixa assessores, apurações, lançamentos e promoções em um único JSON.
          </p>
          <ExportarJSON />
        </Card>
      </div>

      <h2 className="coins-h2">Histórico de promoções</h2>
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
                    <td style={{ fontWeight: 500 }}>{p.paraNivel}</td>
                    <td style={{ textAlign: "right" }}>{fmt(p.custo)}</td>
                    <td>{rotuloMes(p.checkpoint)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h2 className="coins-h2">Log</h2>
      <p style={{ fontSize: 13, color: "var(--texto-suave)", marginTop: -6, marginBottom: 14 }}>
        Tudo que altera saldo ou permissão (§4). Mostrando os 50 mais recentes.
      </p>
      <AjustesLog entradas={log} />
    </>
  );
}
