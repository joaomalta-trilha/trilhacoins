import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Volta do login do Google com um `code` na URL — troca por uma sessão
// e manda a pessoa para dentro do app. Se não houver `usuarios` para
// ela, o layout de (app) mostra a tela de "sem acesso" (§4).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("next") ?? "/equipe";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${proximo}`);
    }
    console.error("Falha ao trocar code por sessão:", error.message);
  } else {
    console.error("Callback de auth chamado sem `code` na URL.");
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}
