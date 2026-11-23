import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Trilha Hub", template: "%s · Trilha Hub" },
  description: "O hub da operação da Trilha Performance Digital: carteira, dossiês, rotinas, processos e Trilha Coins.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
