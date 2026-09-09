"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SeletorAssessor({
  assessores,
  selecionadoId,
}: {
  assessores: { id: string; nome: string }[];
  selecionadoId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const qs = searchParams.toString();
    router.push(`/assessor/${e.target.value}${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      className="input"
      value={selecionadoId}
      onChange={onChange}
      style={{ fontSize: 15, padding: "8px 10px" }}
    >
      {assessores.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}
        </option>
      ))}
    </select>
  );
}
