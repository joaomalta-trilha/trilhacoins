import { obterSessao } from "@/lib/auth/sessao";
import { Cena, PaginaTopo } from "@/components/hub/basicos";
import { NavTabs } from "@/components/nav-tabs";

export const metadata = { title: "Trilha Coins" };

// Módulo Trilha Coins dentro do Hub: topo próprio + abas internas.
// As telas e regras são as mesmas do coins.trilhaperformance.com.br.
export default async function CoinsLayout({ children }: LayoutProps<"/coins">) {
  const sessao = await obterSessao();
  return (
    <Cena>
      <PaginaTopo
        titulo="Trilha Coins"
        lede="O plano de carreira: saldo de coins, metas do mês, checkpoints e promoções."
      >
        {sessao && <NavTabs papel={sessao.papel} />}
      </PaginaTopo>
      <div className="coins-corpo">{children}</div>
    </Cena>
  );
}
