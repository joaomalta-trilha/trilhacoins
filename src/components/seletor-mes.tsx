"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ehCheckpoint } from "@/lib/trilhacoins";
import { rotuloMes } from "./ui";

export function SeletorMes({
  meses,
  mesAtual,
  paramName = "mes",
  rotulo = "Mês de referência",
}: {
  meses: string[];
  mesAtual: string;
  paramName?: string;
  rotulo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, e.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 12, color: "var(--texto-suave)" }}>{rotulo}</label>
      <select className="input" value={mesAtual} onChange={onChange} style={{ width: 150 }}>
        {meses.map((m) => (
          <option key={m} value={m}>
            {rotuloMes(m)}
            {ehCheckpoint(m) ? " · checkpoint" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
