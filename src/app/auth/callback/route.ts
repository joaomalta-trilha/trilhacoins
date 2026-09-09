import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Diagnóstico temporário: acha caractere fora do intervalo Latin1
// (>255) numa variável de ambiente sem nunca logar o valor inteiro.
function diagnosticarCaractereInvalido(nome: string, valor: string | undefined): string | null {
  if (!valor) return `${nome}: variável não definida`;
  for (let i = 0; i < valor.length; i++) {
    const codigo = valor.charCodeAt(i);
    if (codigo > 255) {
      return `${nome}: comprimento=${valor.length}, caractere inválido no índice ${i} (código ${codigo}), vizinhos="${valor.slice(Math.max(0, i - 3), i + 4)}"`;
    }
  }
  return `${nome}: comprimento=${valor.length}, ok (sem caractere >255)`;
}

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
    console.error(diagnosticarCaractereInvalido("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL));
    console.error(
      diagnosticarCaractereInvalido("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
  } else {
    console.error("Callback de auth chamado sem `code` na URL.");
  }

  return NextResponse.redirect(`${origin}/login?erro=auth`);
}
