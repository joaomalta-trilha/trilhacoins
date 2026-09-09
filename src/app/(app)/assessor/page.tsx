import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth/sessao";
import { listarAssessoresAtivos } from "@/lib/data/repo";
import { Card } from "@/components/ui";

export default async function AssessorIndexPage() {
  const sessao = await obterSessao();

  if (sessao?.papel === "assessor") {
    if (sessao.assessorId) redirect(`/assessor/${sessao.assessorId}`);
    // Aprovado em Ajustes, mas ninguém escolheu a qual assessor essa
    // conta corresponde — não é um estado pra empurrar pra /equipe ou
    // /ajustes (páginas de gestão que essa pessoa não deveria ver).
    return (
      <Card style={{ maxWidth: 480 }}>
        <div className="rotulo">Cadastro incompleto</div>
        <p style={{ fontSize: 13, marginTop: 10 }}>
          Seu acesso está liberado, mas ainda não foi vinculado a um assessor. Peça para a
          diretoria selecionar seu nome no campo &quot;Assessor vinculado&quot;, em Ajustes →
          Usuários.
        </p>
      </Card>
    );
  }

  const assessores = await listarAssessoresAtivos();
  if (assessores.length === 0) {
    redirect("/ajustes");
  }
  redirect(`/assessor/${assessores[0].id}`);
}
