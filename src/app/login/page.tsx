import { redirect } from "next/navigation";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { LoginButton } from "@/components/login-button";
import { LogoTrilhaCoins } from "@/components/marca";

export default async function LoginPage() {
  const usuario = await obterUsuarioAutenticado();
  if (usuario) redirect("/equipe");

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 24,
      }}
    >
      <LogoTrilhaCoins />
      <div className="card" style={{ maxWidth: 360, textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--texto-suave)", marginBottom: 18 }}>
          Acesso restrito a e-mails <strong>@somostrilha.com.br</strong>.
        </p>
        <LoginButton />
      </div>
    </div>
  );
}
