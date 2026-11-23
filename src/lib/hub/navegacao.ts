import type { Papel } from "@/lib/auth/sessao";

// Navegação do Hub: um login, duas experiências. O papel gravado no
// banco decide quem pode trocar de experiência; o menu é só a porta —
// a barreira de verdade é o RLS e as travas de página (`exigirGestao`).

export type Modo = "assessor" | "gestao";

export type IconeNav =
  | "inicio"
  | "carteira"
  | "trilha"
  | "coins"
  | "tarefas"
  | "reunioes"
  | "gestao"
  | "clientes"
  | "usuarios"
  | "saude";

export interface ItemNav {
  href: string;
  rotulo: string;
  icone: IconeNav;
  /** módulo ainda não construído: aparece desabilitado, com a fase prevista */
  emBreve?: string;
}

export const COOKIE_MODO = "hub_modo";
export const COOKIE_VER_COMO = "hub_ver_como";

export function podeTrocarModo(papel: Papel): boolean {
  return papel !== "assessor";
}

/** Assessor vive sempre na própria experiência; gestão entra na Visão geral, salvo se pediu "ver como assessor". */
export function modoEfetivo(papel: Papel, preferido?: string | null): Modo {
  if (papel === "assessor") return "assessor";
  return preferido === "assessor" ? "assessor" : "gestao";
}

export function paginaInicial(modo: Modo): string {
  return modo === "assessor" ? "/inicio" : "/gestao";
}

export function itensDeNavegacao(papel: Papel, modo: Modo): ItemNav[] {
  if (modo === "assessor") {
    return [
      { href: "/inicio", rotulo: "Início", icone: "inicio" },
      { href: "/clientes", rotulo: "Minha carteira", icone: "carteira" },
      { href: "/trilha", rotulo: "Trilha do Assessor", icone: "trilha" },
      { href: "/coins", rotulo: "Trilha Coins", icone: "coins" },
      { href: "/tarefas", rotulo: "Tarefas", icone: "tarefas", emBreve: "fase 3" },
      { href: "/reunioes", rotulo: "Reuniões", icone: "reunioes", emBreve: "fase 3" },
    ];
  }
  const itens: ItemNav[] = [
    { href: "/gestao", rotulo: "Visão geral", icone: "gestao" },
    { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
    { href: "/trilha", rotulo: "Trilha do Assessor", icone: "trilha" },
    { href: "/coins", rotulo: "Trilha Coins", icone: "coins" },
  ];
  if (papel === "diretoria") itens.push({ href: "/gestao/usuarios", rotulo: "Usuários", icone: "usuarios" });
  itens.push({ href: "/saude", rotulo: "Saúde dos clientes", icone: "saude", emBreve: "fase 4" });
  return itens;
}

/**
 * Qual item do menu está ativo: o de href mais longo que casa com a
 * rota (assim "/gestao/usuarios" não acende "Visão geral" junto).
 */
export function itemAtivo(pathname: string, itens: ItemNav[]): string | null {
  let melhor: string | null = null;
  for (const { href, emBreve } of itens) {
    if (emBreve) continue;
    const casa = pathname === href || pathname.startsWith(`${href}/`);
    if (casa && (!melhor || href.length > melhor.length)) melhor = href;
  }
  return melhor;
}

const ROTULO_PAPEL: Record<Papel, string> = {
  diretoria: "Diretoria",
  coordenacao: "Coordenação",
  assessor: "Assessor",
};

/** O cargo ("Gerente de Performance") é só rótulo; quem decide acesso é o papel. */
export function rotuloPapel(papel: Papel, cargo?: string | null): string {
  return cargo?.trim() || ROTULO_PAPEL[papel];
}
