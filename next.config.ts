import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O TrilhaCoins virou um módulo do Hub, em /coins. Os endereços antigos
  // (favoritos, links no WhatsApp) continuam funcionando.
  async redirects() {
    return [
      { source: "/equipe", destination: "/coins/equipe", permanent: false },
      { source: "/lancar", destination: "/coins/lancar", permanent: false },
      { source: "/assessor", destination: "/coins/assessor", permanent: false },
      { source: "/assessor/:id", destination: "/coins/assessor/:id", permanent: false },
      { source: "/ajustes", destination: "/coins/ajustes", permanent: false },
    ];
  },
};

export default nextConfig;
