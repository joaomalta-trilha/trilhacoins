import "server-only";

import { redirect } from "next/navigation";
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

  // "assessores!assessor_id" desambigua o embed: desde que
  // `coordenacoes_assessores` existe, há dois caminhos possíveis entre
  // `usuarios` e `assessores` (o vínculo direto de assessor e a
  // carteira de coordenação via a tabela nova) — sem isso o PostgREST
  // recusa a consulta por ambiguidade.
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("papel, assessor_id, ativo, assessores!assessor_id(nome)")
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

/**
 * Trava de página para telas de gestão (Equipe, Lançar mês, Ajustes):
 * o menu já esconde esses links pra quem tem papel "assessor", mas o
 * menu é só UI — isso aqui é a barreira de verdade, pro caso de a
 * pessoa cair na URL por qualquer outro caminho (§7: assessor nunca
 * vê saldo/progressão dos colegas).
 */
export async function exigirGestao(): Promise<SessaoUsuario> {
  const sessao = await obterSessao();
  // Na prática o layout de (app) já barra isso antes de renderizar a
  // página — este `redirect("/")` é só o fallback defensivo.
  if (!sessao) redirect("/");
  if (sessao.papel === "assessor") redirect("/assessor");
  return sessao;
}

/** Igual a `exigirGestao`, mas só diretoria — Ajustes é exclusivo dela (§7). */
export async function exigirDiretoria(): Promise<SessaoUsuario> {
  const sessao = await exigirGestao();
  if (sessao.papel !== "diretoria") redirect("/equipe");
  return sessao;
}
