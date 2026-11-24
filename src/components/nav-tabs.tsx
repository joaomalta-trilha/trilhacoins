"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Papel } from "@/lib/auth/sessao";

// Abas internas do módulo Trilha Coins (dentro do Hub, em /coins).
const ABAS: { href: string; nome: string; papeis: Papel[] }[] = [
  { href: "/coins/equipe", nome: "Equipe", papeis: ["diretoria", "coordenacao"] },
  { href: "/coins/lancar", nome: "Lançar mês", papeis: ["diretoria", "coordenacao"] },
  { href: "/coins/assessor", nome: "Assessor", papeis: ["diretoria", "coordenacao", "assessor"] },
  { href: "/coins/ajustes", nome: "Ajustes", papeis: ["diretoria"] },
];

export function NavTabs({ papel }: { papel: Papel }) {
  const pathname = usePathname();
  const abasVisiveis = ABAS.filter((a) => a.papeis.includes(papel));
  // Assessor só tem o próprio painel: uma aba sozinha não ajuda em nada.
  if (abasVisiveis.length < 2) return null;
  return (
    <nav className="nav-tabs" aria-label="Telas do Trilha Coins">
      {abasVisiveis.map((a) => {
        const ativo = pathname === a.href || pathname.startsWith(`${a.href}/`);
        return (
          <Link key={a.href} href={a.href} className={`nav-tab${ativo ? " ativo" : ""}`} aria-current={ativo ? "page" : undefined}>
            {a.nome}
          </Link>
        );
      })}
    </nav>
  );
}
