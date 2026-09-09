import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrilhaCoins",
  description: "Gestão de metas e progressão dos assessores — Trilha Performance Digital",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
