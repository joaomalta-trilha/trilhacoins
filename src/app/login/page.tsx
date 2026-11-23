import { redirect } from "next/navigation";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { LoginButton } from "@/components/login-button";
import { LogoTrilha } from "@/components/hub/logo-trilha";

export default async function LoginPage() {
  const usuario = await obterUsuarioAutenticado();
  if (usuario) redirect("/");

  return (
    <div className="tela-centro login">
      <div className="login-marca">
        <LogoTrilha altura={34} />
        <p className="rotulo" style={{ marginTop: 14 }}>
          Trilha Hub · a operação num lugar só
        </p>
      </div>
      <div className="card login-card">
        <p style={{ fontSize: 14, color: "var(--texto)", margin: "0 0 18px" }}>
          Entre com a sua conta <strong>@somostrilha.com.br</strong>.
        </p>
        <LoginButton />
      </div>
    </div>
  );
}
