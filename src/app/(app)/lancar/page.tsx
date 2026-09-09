import { GradeLancamento } from "@/components/grade-lancamento";
import { exigirGestao } from "@/lib/auth/sessao";
import {
  listarAssessoresAtivos,
  listarMesesRecentes,
  mesReferenciaPadrao,
  obterLancamentosDoMes,
  statusDoMes,
} from "@/lib/data/repo";
import type { Lancamentos } from "@/lib/trilhacoins";

export default async function LancarPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const [sessao, { mes: mesParam }] = await Promise.all([exigirGestao(), searchParams]);
  const mes = mesParam ?? mesReferenciaPadrao();

  const assessores = await listarAssessoresAtivos();
  const [status, ...lancamentosPorAssessor] = await Promise.all([
    statusDoMes(mes),
    ...assessores.map((a) => obterLancamentosDoMes(a.id, mes)),
  ]);

  const lancamentosIniciais: Record<string, Lancamentos> = {};
  assessores.forEach((a, i) => {
    lancamentosIniciais[a.id] = lancamentosPorAssessor[i];
  });

  return (
    <GradeLancamento
      assessores={assessores.map((a) => ({ id: a.id, nome: a.nome, nivel: a.nivel }))}
      mes={mes}
      meses={listarMesesRecentes()}
      lancamentosIniciais={lancamentosIniciais}
      status={status}
      ehDiretoria={sessao?.papel === "diretoria"}
    />
  );
}
