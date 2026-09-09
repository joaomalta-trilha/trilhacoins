import "server-only";

import { createClient } from "@/lib/supabase/server";

export type Papel = "diretoria" | "coordenacao" | "assessor";

export interface SessaoUsuario {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  nome: string;
}

export interface UsuarioAutenticado {
  id: string;
  email: string;
}

/** Só verifica se há uma sessão válida no Supabase Auth — não olha `usuarios`. */
export async function obterUsuarioAutenticado(): Promise<UsuarioAutenticado | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email ?? "" };
}

/**
 * Sessão cruzada com `usuarios`. Retorna `null` quando a pessoa está
 * autenticada no Google mas não tem linha em `usuarios` (ou está
 * inativa) — é o "entra sem acesso a nada" do §4. Use
 * `obterUsuarioAutenticado` para distinguir isso de "nem logou".
 */
export async function obterSessao(): Promise<SessaoUsuario | null> {
  const supabase = await createClient();

  const usuarioAuth = await obterUsuarioAutenticado();
  if (!usuarioAuth) return null;

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("papel, assessor_id, ativo, assessores(nome)")
    .eq("id", usuarioAuth.id)
    .maybeSingle();

  if (error) console.error("Falha ao consultar usuarios em obterSessao:", error.message);
  if (!usuario || !usuario.ativo) return null;

  const assessor = Array.isArray(usuario.assessores) ? usuario.assessores[0] : usuario.assessores;

  return {
    id: usuarioAuth.id,
    email: usuarioAuth.email,
    papel: usuario.papel as Papel,
    assessorId: usuario.assessor_id,
    nome: assessor?.nome ?? usuarioAuth.email,
  };
}
