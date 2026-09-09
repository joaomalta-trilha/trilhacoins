import { describe, expect, it } from "vitest";
import { calcularRankingMes, montarRankingDePctBase, rankingParaAssessor } from "./ranking";

describe("calcularRankingMes", () => {
  const assessores = [
    { assessorId: "a", nome: "A", lancamentos: { "3.1": "Excelente" } }, // 300/1300
    { assessorId: "b", nome: "B", lancamentos: { "3.1": "Excelente", "3.2": "0 churns" } }, // 500/1300
    { assessorId: "c", nome: "C", lancamentos: undefined }, // 0
    { assessorId: "d", nome: "D", lancamentos: { "3.1": "Boa" } }, // 150/1300
  ];

  it("ordena por % da base recorrente, do maior para o menor", () => {
    const ranking = calcularRankingMes(assessores);
    expect(ranking.map((r) => r.assessorId)).toEqual(["b", "a", "d", "c"]);
  });

  it("posições são 1-based", () => {
    const ranking = calcularRankingMes(assessores);
    expect(ranking[0].posicao).toBe(1);
    expect(ranking[3].posicao).toBe(4);
  });

  it("nomeia só o pódio (top 3) — ninguém abaixo do 3º lugar é nomeado", () => {
    const ranking = calcularRankingMes(assessores);
    expect(ranking.filter((r) => r.nomeado)).toHaveLength(3);
    expect(ranking[3].nomeado).toBe(false);
  });

  it("carrega o nome de cada assessor na posição", () => {
    const ranking = calcularRankingMes(assessores);
    expect(ranking[0]).toMatchObject({ assessorId: "b", nome: "B" });
  });
});

describe("montarRankingDePctBase", () => {
  it("monta a mesma estrutura (ordem, posição, pódio) a partir de % já calculados por fora", () => {
    const ranking = montarRankingDePctBase([
      { assessorId: "x", nome: "X", pctBase: 10 },
      { assessorId: "y", nome: "Y", pctBase: 90 },
      { assessorId: "z", nome: "Z", pctBase: 50 },
    ]);
    expect(ranking.map((r) => r.assessorId)).toEqual(["y", "z", "x"]);
    expect(ranking.map((r) => r.posicao)).toEqual([1, 2, 3]);
    expect(ranking.every((r) => r.nomeado)).toBe(true); // só 3 entradas, todas no pódio
  });
});

describe("rankingParaAssessor", () => {
  it("expõe o pódio nomeado e a posição do próprio assessor, mesmo fora do pódio", () => {
    const assessores = [
      { assessorId: "a", nome: "A", lancamentos: { "3.1": "Excelente" } },
      { assessorId: "b", nome: "B", lancamentos: { "3.1": "Boa" } },
      { assessorId: "c", nome: "C", lancamentos: { "3.2": "1 churn" } },
      { assessorId: "d", nome: "D", lancamentos: undefined },
    ];
    const ranking = calcularRankingMes(assessores);
    const { podio, minhaPosicao } = rankingParaAssessor(ranking, "d");

    expect(podio.map((p) => p.assessorId)).toEqual(["a", "b", "c"]);
    expect(minhaPosicao?.assessorId).toBe("d");
    expect(minhaPosicao?.posicao).toBe(4);
  });
});
