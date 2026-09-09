import { describe, expect, it } from "vitest";
import { calcularPainelAssessor } from "./painel";

const HOJE = new Date(2026, 6, 15); // 15/07/2026 → mês corrente "2026-07"

describe("calcularPainelAssessor", () => {
  it("compõe saldo, progresso e projeção para um nível sem pré-requisito qualitativo", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 0,
      nivelAtual: "Júnior I",
      apuracoesFechadas: [
        { mes: "2026-05", coinsRecorrente: 1300, coinsBonus: 0 },
        { mes: "2026-06", coinsRecorrente: 1000, coinsBonus: 100 },
      ],
      promocoesEfetivadas: [],
      recorrenteJaLancadoNoMesCorrente: 0,
      hoje: HOJE,
    });

    expect(r.saldo).toBe(1300 + 1000 + 100); // 2400
    expect(r.proximoNivel).toBe("Júnior II");
    expect(r.custoProximaTransicao).toBe(2700);
    expect(r.faltaCoins).toBe(300);
    expect(r.pctNivel).toBeCloseTo((2400 / 2700) * 100);
    expect(r.aptoPorSaldo).toBe(false);
    expect(r.requisitoMacro).toBeNull();
    expect(r.aptoParaPromover).toBe(false);
    expect(r.mesCorrente).toBe("2026-07");
    expect(r.proximoCheckpoint).toBe("2026-09");
    expect(r.totalGanho).toBe(2400);
  });

  it("saldo suficiente mas requisito macro pendente → apto por saldo, não apto para promover", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 6800,
      nivelAtual: "Júnior III",
      apuracoesFechadas: [],
      promocoesEfetivadas: [],
      recorrenteJaLancadoNoMesCorrente: 0,
      requisitoMacroAtendido: false,
      hoje: HOJE,
    });

    expect(r.aptoPorSaldo).toBe(true);
    expect(r.requisitoMacro).toBe("Avaliação de autonomia nas contas");
    expect(r.requisitoMacroAtendido).toBe(false);
    expect(r.aptoParaPromover).toBe(false); // saldo fica retido, não debitado (§9)
  });

  it("requisito macro atendido pela diretoria libera a promoção", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 6800,
      nivelAtual: "Júnior III",
      apuracoesFechadas: [],
      promocoesEfetivadas: [],
      recorrenteJaLancadoNoMesCorrente: 0,
      requisitoMacroAtendido: true,
      hoje: HOJE,
    });

    expect(r.aptoParaPromover).toBe(true);
  });

  it("nível máximo (Partner) não projeta próxima transição", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 50000,
      nivelAtual: "Partner",
      apuracoesFechadas: [],
      promocoesEfetivadas: [],
      recorrenteJaLancadoNoMesCorrente: 0,
      hoje: HOJE,
    });

    expect(r.proximoNivel).toBeNull();
    expect(r.custoProximaTransicao).toBeNull();
    expect(r.faltaCoins).toBe(0);
    expect(r.pctNivel).toBe(100);
    expect(r.aptoPorSaldo).toBe(false);
    expect(r.mesesAtePromocao).toBeNull();
    expect(r.checkpointProvavel).toBeNull();
  });

  it("promoções efetivadas descontam do saldo mas não zeram o excedente", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 4500,
      nivelAtual: "Júnior II",
      apuracoesFechadas: [],
      promocoesEfetivadas: [{ custo: 4000 }],
      recorrenteJaLancadoNoMesCorrente: 0,
      hoje: HOJE,
    });

    expect(r.saldo).toBe(500);
    expect(r.totalGasto).toBe(4000);
  });

  it("média mensal e aproveitamento usam só os meses com apuração fechada e lançada", () => {
    const r = calcularPainelAssessor({
      saldoInicial: 0,
      nivelAtual: "Júnior I",
      apuracoesFechadas: [
        { mes: "2026-04", coinsRecorrente: 1300, coinsBonus: 0 },
        { mes: "2026-05", coinsRecorrente: 900, coinsBonus: 0 },
        { mes: "2026-06", coinsRecorrente: 700, coinsBonus: 200 },
      ],
      promocoesEfetivadas: [],
      recorrenteJaLancadoNoMesCorrente: 0,
      hoje: HOJE,
    });

    expect(r.mediaMensal).toBeCloseTo((1300 + 900 + 900) / 3);
    expect(r.aproveitamento).toBeCloseTo(((1300 + 900 + 700) / (1300 * 3)) * 100);
  });
});
