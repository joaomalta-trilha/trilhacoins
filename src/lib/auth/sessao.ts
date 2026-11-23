import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Papel = "diretoria" | "coordenacao" | "assessor";

export interface SessaoUsuario {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  nome: string;
  /** rótulo de exibição ("Gerente de Performance"); quem decide acesso é o papel */
  cargo: string | null;
}

export interface UsuarioAutenticado {
  id: string;
  email: string;
}

/** Só verifica se há uma sessão válida no Supabase Auth — não olha `usuarios`. */
export const obterUsuarioAutenticado = cache(async (): Promise<UsuarioAutenticado | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email ?? "" };
});

interface LinhaUsuario {
  papel: Papel;
  assessor_id: string | null;
  ativo: boolean;
  nome?: string | null;
  cargo?: string | null;
  assessores: { nome: string } | { nome: string }[] | null;
}

/**
 * Sessão cruzada com `usuarios`. Retorna `null` quando a pessoa está
 * autenticada no Google mas não tem linha em `usuarios` (ou está
 * inativa) — é o "entra sem acesso a nada" do §4 do briefing do Coins.
 * Use `obterUsuarioAutenticado` para distinguir isso de "nem logou".
 *
 * `cache` deduplica a consulta entre layout e página na mesma requisição.
 */
export const obterSessao = cache(async (): Promise<SessaoUsuario | null> => {
  const supabase = await createClient();

  const usuarioAuth = await obterUsuarioAutenticado();
  if (!usuarioAuth) return null;

  // "assessores!assessor_id" desambigua o embed: há dois caminhos entre
  // `usuarios` e `assessores` (vínculo direto e carteira de coordenação).
  const consulta = (colunas: string) =>
    supabase.from("usuarios").select(colunas).eq("id", usuarioAuth.id).maybeSingle<LinhaUsuario>();

  let { data: usuario, error } = await consulta("papel, assessor_id, ativo, nome, cargo, assessores!assessor_id(nome)");
  // Banco ainda sem a migration 0007 (sem nome/cargo): cai para a forma antiga.
  if (error && /column .*(nome|cargo)|PGRST204|42703/i.test(`${error.code} ${error.message}`)) {
    ({ data: usuario, error } = await consulta("papel, assessor_id, ativo, assessores!assessor_id(nome)"));
  }

  if (error) console.error("Falha ao consultar usuarios em obterSessao:", error.message);
  if (!usuario || !usuario.ativo) return null;

  const assessor = Array.isArray(usuario.assessores) ? usuario.assessores[0] : usuario.assessores;

  return {
    id: usuarioAuth.id,
    email: usuarioAuth.email,
    papel: usuario.papel,
    assessorId: usuario.assessor_id,
    nome: usuario.nome?.trim() || assessor?.nome || usuarioAuth.email.split("@")[0],
    cargo: usuario.cargo?.trim() || null,
  };
});

/**
 * Trava de página para telas de gestão. O menu já esconde esses links
 * de quem tem papel "assessor", mas o menu é só UI — isso aqui é a
 * barreira de verdade (junto com o RLS do banco).
 */
export async function exigirGestao(): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  if (!sessao) redirect("/");
  if (sessao.papel === "assessor") redirect("/inicio");
  return sessao;
}

/** Igual a `exigirGestao`, mas só diretoria (inclui o gestor, que tem os mesmos acessos). */
export async function exigirDiretoria(): Promise<SessaoUsuario> {
  const sessao = await exigirGestao();
  if (sessao.papel !== "diretoria") redirect("/gestao");
  return sessao;
}
