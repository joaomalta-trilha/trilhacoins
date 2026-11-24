import { redirect } from "next/navigation";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { LoginButton } from "@/components/login-button";
import { SimboloTrilha } from "@/components/marca";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const usuario = await obterUsuarioAutenticado();
  if (usuario) redirect("/");

  return (
    <div className="tela-centro">
      <div className="brilho" aria-hidden="true" />
      <div className="porta">
        <span className="marca" aria-label="Trilha Hub">
          <span className="mk" aria-hidden="true">
            <SimboloTrilha size={18} />
          </span>
          <span className="marca-texto">
            trilha <span className="marca-produto">hub</span>
          </span>
        </span>
        <div>
          <h1>A operação num lugar só</h1>
          <p className="lede">Carteira, dossiês, rotina, Trilha do Assessor e Trilha Coins.</p>
        </div>
        <div className="card">
          <p>
            Entre com a sua conta <strong>@somostrilha.com.br</strong>.
          </p>
          <LoginButton />
        </div>
      </div>
    </div>
  );
}
