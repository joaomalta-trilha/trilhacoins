"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Coins,
  Compass,
  HeartPulse,
  House,
  LayoutDashboard,
  ListTodo,
  type LucideIcon,
  UserCog,
} from "lucide-react";
import { type IconeNav, type ItemNav, itemAtivo } from "@/lib/hub/navegacao";

const ICONES: Record<IconeNav, LucideIcon> = {
  inicio: House,
  carteira: Briefcase,
  trilha: Compass,
  coins: Coins,
  tarefas: ListTodo,
  reunioes: CalendarDays,
  gestao: LayoutDashboard,
  clientes: Building2,
  assessoria: Briefcase,
  usuarios: UserCog,
  saude: HeartPulse,
};

/** Nome curto para a doca do celular, onde cada item tem ~70px. */
const CURTO: Record<string, string> = {
  "Minha carteira": "Carteira",
  "Trilha do Assessor": "Trilha",
  "Trilha Coins": "Coins",
  "Visão geral": "Visão geral",
};

export function IconeDoItem({ icone, tamanho = 18 }: { icone: IconeNav; tamanho?: number }) {
  const Icone = ICONES[icone];
  return <Icone size={tamanho} strokeWidth={1.6} aria-hidden="true" />;
}

/**
 * Seções em pílulas no centro da barra (computador). Módulos "em breve"
 * não entram aqui: aparecem nas telas, onde explicam o que vem.
 */
export function NavPrincipal({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  const prontos = itens.filter((i) => !i.emBreve);
  const ativo = itemAtivo(pathname, prontos);
  return (
    <nav className="pills nav-principal" aria-label="Menu principal">
      {prontos.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="pill"
          aria-current={ativo === item.href ? "page" : undefined}
        >
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}

/** Doca flutuante no rodapé (celular). */
export function Doca({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  const prontos = itens.filter((i) => !i.emBreve).slice(0, 5);
  const ativo = itemAtivo(pathname, prontos);
  return (
    <nav className="doca" aria-label="Menu principal">
      {prontos.map((item) => (
        <Link key={item.href} href={item.href} aria-current={ativo === item.href ? "page" : undefined}>
          <IconeDoItem icone={item.icone} tamanho={19} />
          <span>{CURTO[item.rotulo] ?? item.rotulo}</span>
        </Link>
      ))}
    </nav>
  );
}

/**
 * Atalho dentro do painel da conta. No celular a doca leva só cinco
 * seções; o que sobra (Usuários) fica aqui. Fecha o painel ao navegar.
 */
export function AtalhoDoPainel({ href, icone, children }: { href: string; icone: IconeNav; children: string }) {
  return (
    <Link
      href={href}
      className="btn btn-secundario"
      onClick={() => document.getElementById("conta-painel")?.hidePopover()}
    >
      <IconeDoItem icone={icone} tamanho={15} />
      {children}
    </Link>
  );
}
