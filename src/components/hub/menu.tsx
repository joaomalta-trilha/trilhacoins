"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
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
  clientes: Briefcase,
  usuarios: UserCog,
  saude: HeartPulse,
};

export function IconeDoItem({ icone, tamanho = 18 }: { icone: IconeNav; tamanho?: number }) {
  const Icone = ICONES[icone];
  return <Icone size={tamanho} strokeWidth={1.6} aria-hidden="true" />;
}

/** Menu lateral (computador). Itens "em breve" aparecem, mas não são link. */
export function MenuLateral({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  const ativo = itemAtivo(pathname, itens);
  return (
    <nav className="hub-nav" aria-label="Menu principal">
      {itens.map((item) =>
        item.emBreve ? (
          <span key={item.href} className="hub-nav-item em-breve" aria-disabled="true" title={`Chega na ${item.emBreve}`}>
            <IconeDoItem icone={item.icone} />
            <span>{item.rotulo}</span>
            <span className="hub-nav-fase">{item.emBreve}</span>
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={`hub-nav-item${ativo === item.href ? " ativo" : ""}`}
            aria-current={ativo === item.href ? "page" : undefined}
          >
            <IconeDoItem icone={item.icone} />
            <span>{item.rotulo}</span>
          </Link>
        )
      )}
    </nav>
  );
}

/** Abas fixas no rodapé (celular): só os módulos que já existem. */
export function MenuAbas({ itens }: { itens: ItemNav[] }) {
  const pathname = usePathname();
  const prontos = itens.filter((i) => !i.emBreve).slice(0, 5);
  const ativo = itemAtivo(pathname, prontos);
  return (
    <nav className="hub-abas" aria-label="Menu principal">
      {prontos.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`hub-aba${ativo === item.href ? " ativo" : ""}`}
          aria-current={ativo === item.href ? "page" : undefined}
        >
          <IconeDoItem icone={item.icone} tamanho={20} />
          <span>{item.rotulo.replace("Trilha do Assessor", "Trilha").replace("Trilha Coins", "Coins").replace("Minha carteira", "Carteira").replace("Visão geral", "Visão")}</span>
        </Link>
      ))}
    </nav>
  );
}
