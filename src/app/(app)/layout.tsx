import { redirect } from "next/navigation";
import { ArrowLeftRight, LogOut } from "lucide-react";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { obterContexto } from "@/lib/hub/contexto";
import { itensDeNavegacao, rotuloPapel } from "@/lib/hub/navegacao";
import { sairAction } from "@/app/auth/actions";
import { trocarModoAction } from "@/app/hub-actions";
import { LogoTrilha } from "@/components/hub/logo-trilha";
import { MenuAbas, MenuLateral } from "@/components/hub/menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuarioAuth = await obterUsuarioAutenticado();
  if (!usuarioAuth) redirect("/login");

  const ctx = await obterContexto();

  if (!ctx) {
    return (
      <div className="tela-centro">
        <LogoTrilha altura={30} />
        <div className="card" style={{ maxWidth: 440 }}>
          <div className="rotulo">Sem acesso</div>
          <p style={{ fontSize: 14, marginTop: 10 }}>
            Você entrou como <strong>{usuarioAuth.email}</strong>, mas o seu acesso ao Trilha Hub ainda não foi
            liberado. Peça para a diretoria aprovar o seu cadastro em Usuários.
          </p>
          <form action={sairAction} style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn-secundario">
              Sair e entrar com outra conta
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { sessao, modo, podeTrocarModo } = ctx;
  const itens = itensDeNavegacao(sessao.papel, modo);
  const papel = rotuloPapel(sessao.papel, sessao.cargo);
  const outroModo = modo === "gestao" ? "assessor" : "gestao";
  const rotuloTroca = modo === "gestao" ? "Ver como assessor" : "Voltar para a gestão";

  const pessoa = (
    <div className="hub-pessoa">
      <div className="hub-avatar" aria-hidden="true">
        {sessao.nome.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="hub-pessoa-nome">{sessao.nome}</div>
        <div className="hub-pessoa-papel">{papel}</div>
      </div>
    </div>
  );

  const acoes = (
    <div className="hub-acoes">
      {podeTrocarModo && (
        <form action={trocarModoAction.bind(null, outroModo)}>
          <button type="submit" className="hub-acao">
            <ArrowLeftRight size={15} strokeWidth={1.6} aria-hidden="true" />
            {rotuloTroca}
          </button>
        </form>
      )}
      <form action={sairAction}>
        <button type="submit" className="hub-acao">
          <LogOut size={15} strokeWidth={1.6} aria-hidden="true" />
          Sair
        </button>
      </form>
    </div>
  );

  return (
    <div className="hub">
      <aside className="hub-lateral">
        <div className="hub-marca">
          <LogoTrilha altura={22} />
          <span className="hub-marca-sub">Hub · {modo === "gestao" ? "Gestão" : "Assessor"}</span>
        </div>
        <MenuLateral itens={itens} />
        <div className="hub-lateral-pe">
          {pessoa}
          {acoes}
        </div>
      </aside>

      <div className="hub-corpo">
        <header className="hub-topo-movel">
          <LogoTrilha altura={18} />
          <details className="hub-menu-pessoa">
            <summary aria-label="Conta e experiência">
              <span className="hub-avatar" aria-hidden="true">
                {sessao.nome.slice(0, 1).toUpperCase()}
              </span>
            </summary>
            <div className="hub-menu-pessoa-painel">
              {pessoa}
              {acoes}
            </div>
          </details>
        </header>
        <main className="hub-main">{children}</main>
      </div>

      <MenuAbas itens={itens} />
    </div>
  );
}
