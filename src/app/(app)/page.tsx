import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth/sessao";

export default async function RootPage() {
  const sessao = await obterSessao();
  if (sessao?.papel === "assessor" && sessao.assessorId) {
    redirect(`/assessor/${sessao.assessorId}`);
  }
  redirect("/equipe");
}
