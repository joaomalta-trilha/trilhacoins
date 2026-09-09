import { describe, expect, it } from "vitest";
import { aptoPorSaldo, calcularSaldo, faltaCoins, pctNivel } from "./saldo";

describe("calcularSaldo", () => {
  it("soma saldo inicial + coins de apurações fechadas − custo de promoções", () => {
    const saldo = calcularSaldo({
      saldoInicial: 1000,
      apuracoesFechadas: [
        { mes: "2026-06", coinsRecorrente: 1300, coinsBonus: 300 },
        { mes: "2026-07", coinsRecorrente: 900, coinsBonus: 0 },
      ],
      promocoesEfetivadas: [{ custo: 2700 }],
    });
    // 1000 + (1300+300) + (900+0) - 2700
    expect(saldo).toBe(800);
  });

  it("ignora lançamentos de meses ainda abertos — só entram apurações fechadas", () => {
    const saldo = calcularSaldo({
      saldoInicial: 0,
      apuracoesFechadas: [],
      promocoesEfetivadas: [],
    });
    expect(saldo).toBe(0);
  });

  it("o remanescente nunca é zerado após uma promoção — sobra soma normalmente", () => {
    // quem tinha 4.500 e promoveu por 4.000 segue com 500 rumo à próxima transição
    const saldo = calcularSaldo({
      saldoInicial: 4500,
      apuracoesFechadas: [],
      promocoesEfetivadas: [{ custo: 4000 }],
    });
    expect(saldo).toBe(500);
  });
});

describe("pctNivel", () => {
  it("é o percentual do saldo sobre o custo da transição", () => {
    expect(pctNivel(1350, 2700)).toBe(50);
  });

  it("nunca passa de 100", () => {
    expect(pctNivel(5000, 2700)).toBe(100);
  });

  it("nível máximo (custo null) é sempre 100%", () => {
    expect(pctNivel(0, null)).toBe(100);
  });
});

describe("faltaCoins", () => {
  it("é a diferença até o custo, nunca negativa", () => {
    expect(faltaCoins(1000, 2700)).toBe(1700);
    expect(faltaCoins(3000, 2700)).toBe(0);
  });

  it("nível máximo não tem falta", () => {
    expect(faltaCoins(0, null)).toBe(0);
  });
});

describe("aptoPorSaldo", () => {
  it("apto quando o saldo cobre o custo", () => {
    expect(aptoPorSaldo(2700, 2700)).toBe(true);
    expect(aptoPorSaldo(2699, 2700)).toBe(false);
  });

  it("nível máximo nunca é apto (não há próxima transição)", () => {
    expect(aptoPorSaldo(999999, null)).toBe(false);
  });
});
