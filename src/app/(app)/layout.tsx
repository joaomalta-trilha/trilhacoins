import { redirect } from "next/navigation";
import { obterSessao, obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { sairAction } from "@/app/auth/actions";
import { NavTabs } from "@/components/nav-tabs";
import { LogoTrilhaCoins } from "@/components/marca";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuarioAuth = await obterUsuarioAutenticado();
  if (!usuarioAuth) redirect("/login");

  const sessao = await obterSessao();

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 60px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <LogoTrilhaCoins />
        {sessao && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{sessao.nome}</div>
              <div style={{ fontSize: 11, color: "var(--texto-suave)" }}>
                {sessao.email} ·{" "}
                {sessao.papel === "diretoria"
                  ? "diretoria"
                  : sessao.papel === "coordenacao"
                    ? "coordenação"
                    : "assessor"}
              </div>
            </div>
            <form action={sairAction}>
              <button type="submit" className="btn-link" style={{ fontSize: 12 }}>
                Sair
              </button>
            </form>
          </div>
        )}
      </header>

      {!sessao ? (
        <div className="card" style={{ marginTop: 26, maxWidth: 480 }}>
          <div className="rotulo">Sem acesso</div>
          <p style={{ fontSize: 13, marginTop: 10 }}>
            Você está logado como <strong>{usuarioAuth.email}</strong>, mas ainda não tem um
            cadastro liberado no TrilhaCoins. Peça para a diretoria te adicionar em Ajustes.
          </p>
          <form action={sairAction} style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-secundario">
              Sair e tentar com outra conta
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 22 }}>
            <NavTabs papel={sessao.papel} />
          </div>
          <main style={{ marginTop: 24 }}>{children}</main>
        </>
      )}
    </div>
  );
}
