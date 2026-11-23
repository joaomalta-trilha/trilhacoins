import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/hub/contexto";

export default async function CoinsPage() {
  const ctx = await obterContexto();
  if (!ctx) return null;
  // Gestão abre na visão da equipe; assessor (ou "ver como assessor") no painel de quem está na tela.
  if (ctx.modo === "gestao") redirect("/coins/equipe");
  redirect(ctx.assessorAlvo ? `/coins/assessor/${ctx.assessorAlvo.id}` : "/coins/assessor");
}
