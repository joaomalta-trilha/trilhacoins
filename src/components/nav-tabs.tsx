"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Papel } from "@/lib/auth/sessao";

const ABAS: { href: string; nome: string; papeis: Papel[] }[] = [
  { href: "/equipe", nome: "Equipe", papeis: ["diretoria", "coordenacao"] },
  { href: "/lancar", nome: "Lançar mês", papeis: ["diretoria", "coordenacao"] },
  { href: "/assessor", nome: "Assessor", papeis: ["diretoria", "coordenacao", "assessor"] },
  { href: "/ajustes", nome: "Ajustes", papeis: ["diretoria"] },
];

export function NavTabs({ papel }: { papel: Papel }) {
  const pathname = usePathname();
  const abasVisiveis = ABAS.filter((a) => a.papeis.includes(papel));
  return (
    <nav className="nav-tabs">
      {abasVisiveis.map((a) => {
        const ativo = pathname === a.href || pathname.startsWith(`${a.href}/`);
        // para quem só tem o próprio painel, "Assessor" não faz sentido — é "Assessor" de quem?
        const nome = a.href === "/assessor" && papel === "assessor" ? "Meu painel" : a.nome;
        return (
          <Link key={a.href} href={a.href} className={`nav-tab${ativo ? " ativo" : ""}`}>
            {nome}
          </Link>
        );
      })}
    </nav>
  );
}
