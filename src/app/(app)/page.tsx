import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth/sessao";

export default async function RootPage() {
  const sessao = await obterSessao();
  // A checagem de "vinculado a um assessor de verdade?" fica só em
  // /assessor — evita duplicar essa lógica em dois lugares.
  if (sessao?.papel === "assessor") {
    redirect("/assessor");
  }
  redirect("/equipe");
}
