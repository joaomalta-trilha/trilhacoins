import { obterSessao } from "@/lib/auth/sessao";
import { NavTabs } from "@/components/nav-tabs";

// Módulo Trilha Coins dentro do Hub: cabeçalho próprio + abas internas.
// As telas e regras são as mesmas do coins.trilhaperformance.com.br.
export default async function CoinsLayout({ children }: LayoutProps<"/coins">) {
  const sessao = await obterSessao();
  return (
    <>
      <header className="pagina-topo">
        <p className="rotulo">Plano de carreira</p>
        <h1>Trilha Coins</h1>
      </header>
      {sessao && <NavTabs papel={sessao.papel} />}
      <div style={{ marginTop: 22 }}>{children}</div>
    </>
  );
}
