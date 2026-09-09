import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth/sessao";
import { listarAssessoresAtivos } from "@/lib/data/repo";

export default async function AssessorIndexPage() {
  const sessao = await obterSessao();
  if (sessao?.papel === "assessor" && sessao.assessorId) {
    redirect(`/assessor/${sessao.assessorId}`);
  }

  const assessores = await listarAssessoresAtivos();
  if (assessores.length === 0) {
    redirect("/ajustes");
  }
  redirect(`/assessor/${assessores[0].id}`);
}
