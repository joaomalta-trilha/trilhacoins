"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setPending(true);
    setErro(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // dica de domínio pro seletor de conta do Google — não é a
        // proteção real (essa é o RLS + tabela `usuarios`), só UX.
        queryParams: { hd: "somostrilha.com.br", prompt: "select_account" },
      },
    });
    if (error) {
      setErro(error.message);
      setPending(false);
    }
    // em caso de sucesso o navegador é redirecionado para o Google —
    // não há mais nada a fazer aqui.
  }

  return (
    <div style={{ width: "100%" }}>
      <button type="button" className="btn btn-primario" disabled={pending} onClick={entrar} aria-busy={pending || undefined}>
        {pending ? "Redirecionando…" : "Entrar com Google"}
      </button>
      {erro && (
        <div className="erro-inline" role="alert" style={{ marginTop: 10 }}>
          Não deu para abrir o login do Google: {erro}
        </div>
      )}
    </div>
  );
}
