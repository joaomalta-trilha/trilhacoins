import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/hub/contexto";
import { paginaInicial } from "@/lib/hub/navegacao";

export default async function RaizPage() {
  const ctx = await obterContexto();
  if (ctx) redirect(paginaInicial(ctx.modo));
  // Sem contexto (logado, mas sem acesso liberado) o layout já mostra o
  // aviso. Não redirecionar para /login aqui: o login manda quem está
  // logado de volta para "/", e isso viraria um laço.
  return null;
}
