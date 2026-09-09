import type { NextRequest } from "next/server";
import { renovarSessao } from "@/lib/supabase/middleware";

// "Proxy" é o novo nome do antigo Middleware a partir do Next 16 (ver
// AGENTS.md) — mesma função, arquivo renomeado.
export async function proxy(request: NextRequest) {
  return renovarSessao(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|brand/).*)"],
};
