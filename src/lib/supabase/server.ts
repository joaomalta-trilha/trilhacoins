import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Client Supabase para Server Components, Server Actions e Route
 * Handlers. Roda com a sessão de quem está logado (cookies), então o
 * RLS do banco filtra por papel automaticamente — é o mecanismo do
 * §3 do briefing ("toda consulta é filtrada no servidor").
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado a partir de um Server Component durante a renderização —
          // não é permitido escrever cookie aqui. O proxy.ts cuida de
          // renovar a sessão nesses casos.
        }
      },
    },
  });
}
