import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Renova o token de sessão do Supabase a cada requisição. Chamado pelo
 * proxy.ts (o antigo "middleware" — renomeado no Next 16, ver AGENTS.md).
 */
export async function renovarSessao(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getClaims valida o JWT e, se preciso, usa o refresh token para
  // renovar — é o que mantém a sessão viva entre navegações.
  await supabase.auth.getClaims();

  return response;
}
