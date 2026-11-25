import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { obterUsuarioAutenticado } from "@/lib/auth/sessao";
import { obterContexto } from "@/lib/hub/contexto";
import { itensDeNavegacao, paginaInicial, rotuloPapel } from "@/lib/hub/navegacao";
import { sairAction } from "@/app/auth/actions";
import { SimboloTrilha } from "@/components/marca";
import { AtalhoDoPainel, Doca, NavPrincipal } from "@/components/hub/menu";
import { ModoToggle } from "@/components/hub/modo-toggle";

function Marca({ href }: { href: string }) {
  return (
    <Link href={href} className="marca" aria-label="Trilha Hub, página inicial">
      <span className="mk" aria-hidden="true">
        <SimboloTrilha size={18} />
      </span>
      <span className="marca-texto">
        trilha <span className="marca-produto">hub</span>
      </span>
    </Link>
  );
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const usuarioAuth = await obterUsuarioAutenticado();
  if (!usuarioAuth) redirect("/login");

  const ctx = await obterContexto();

  if (!ctx) {
    return (
      <div className="tela-centro">
        <div className="brilho" aria-hidden="true" />
        <div className="porta">
          <Marca href="/" />
          <div>
            <h1>Quase lá</h1>
            <p className="lede">Seu acesso ao Trilha Hub ainda não foi liberado.</p>
          </div>
          <div className="card">
            <p>
              Você entrou como <strong>{usuarioAuth.email}</strong>. Peça para a diretoria aprovar o seu cadastro em
              Usuários; depois é só recarregar esta página.
            </p>
            <form action={sairAction} style={{ width: "100%" }}>
              <button type="submit" className="btn btn-secundario">
                Sair e entrar com outra conta
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const { sessao, modo, podeTrocarModo } = ctx;
  const itens = itensDeNavegacao(sessao.papel, modo);
  const foraDaDoca = itens.filter((i) => !i.emBreve).slice(5);
  const papel = rotuloPapel(sessao.papel, sessao.cargo);
  const inicial = sessao.nome.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div className="hub">
      <a href="#conteudo" className="pular">
        Pular para o conteúdo
      </a>
      <div className="brilho" aria-hidden="true" />

      <div className="wrap">
        <header className="barra">
          <Marca href={paginaInicial(modo)} />
          <NavPrincipal itens={itens} />
          <div className="barra-direita">
            {podeTrocarModo && <ModoToggle modo={modo} />}
            <button type="button" className="conta-botao" popoverTarget="conta-painel" aria-label={`Conta de ${sessao.nome}`}>
              {inicial}
            </button>
          </div>
        </header>
      </div>

      <div id="conta-painel" popover="auto" className="conta-painel">
        <div className="conta-pessoa">
          <span className="conta-botao" aria-hidden="true">
            {inicial}
          </span>
          <div style={{ minWidth: 0 }}>
            <b>{sessao.nome}</b>
            <span>{papel}</span>
          </div>
        </div>
        {foraDaDoca.length > 0 && (
          // a doca do celular leva cinco seções; as outras ficam aqui
          <div className="conta-secao so-celular">
            {foraDaDoca.map((i) => (
              <AtalhoDoPainel key={i.href} href={i.href} icone={i.icone}>
                {i.rotulo}
              </AtalhoDoPainel>
            ))}
          </div>
        )}
        {podeTrocarModo && (
          <div className="conta-secao">
            <span>Experiência</span>
            <ModoToggle modo={modo} />
          </div>
        )}
        <div className="conta-secao">
          <form action={sairAction}>
            <button type="submit" className="btn btn-secundario">
              <LogOut strokeWidth={1.6} aria-hidden="true" />
              Sair
            </button>
          </form>
        </div>
      </div>

      <main id="conteudo">{children}</main>

      <Doca itens={itens} />
    </div>
  );
}
