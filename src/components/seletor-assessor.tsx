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
    router.push(`/coins/assessor/${e.target.value}${qs ? `?${qs}` : ""}`);
  }

  return (
    <select
      className="input pill-select"
      value={selecionadoId}
      onChange={onChange}
      aria-label="Assessor"
      style={{ fontSize: 15, height: 44, paddingLeft: 20 }}
    >
      {assessores.map((a) => (
        <option key={a.id} value={a.id}>
          {a.nome}
        </option>
      ))}
    </select>
  );
}
