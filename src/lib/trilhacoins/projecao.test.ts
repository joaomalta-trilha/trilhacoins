import { describe, expect, it } from "vitest";
import { dataProvavelPromocao, potencialMesCorrente, projetadoNoCheckpoint } from "./projecao";

describe("potencialMesCorrente", () => {
  it("é o que falta para bater 1.300 no mês corrente", () => {
    expect(potencialMesCorrente(800)).toBe(500);
  });

  it("nunca é negativo mesmo se o lançado já passou de 1.300", () => {
    expect(potencialMesCorrente(1500)).toBe(0);
  });

  it("mês sem nenhum lançamento tem potencial cheio", () => {
    expect(potencialMesCorrente(0)).toBe(1300);
  });
});

describe("projetadoNoCheckpoint", () => {
  it("soma saldo + potencial do mês corrente + 1.300 por mês futuro até o checkpoint", () => {
    const projetado = projetadoNoCheckpoint({
      saldo: 1000,
      mesCorrente: "2026-07",
      proximoCheckpoint: "2026-09",
      recorrenteJaLancadoNoMesCorrente: 800,
    });
    // 1000 + (1300-800) + 1300*mesesEntre(07,09)=2 → 1000+500+2600
    expect(projetado).toBe(4100);
  });

  it("quando o mês corrente já é o checkpoint, só soma saldo + potencial", () => {
    const projetado = projetadoNoCheckpoint({
      saldo: 2000,
      mesCorrente: "2026-09",
      proximoCheckpoint: "2026-09",
      recorrenteJaLancadoNoMesCorrente: 0,
    });
    expect(projetado).toBe(2000 + 1300 + 0);
  });

  it("não soma o que já foi lançado no mês corrente além do potencial restante — só o saldo fechado conta", () => {
    // 800 já lançados neste mês NÃO entram diretamente: só via potencial restante (500)
    const comLancamento = projetadoNoCheckpoint({
      saldo: 1000,
      mesCorrente: "2026-07",
      proximoCheckpoint: "2026-07",
      recorrenteJaLancadoNoMesCorrente: 800,
    });
    const semLancamento = projetadoNoCheckpoint({
      saldo: 1000,
      mesCorrente: "2026-07",
      proximoCheckpoint: "2026-07",
      recorrenteJaLancadoNoMesCorrente: 0,
    });
    expect(comLancamento).toBe(1500); // 1000 + 500
    expect(semLancamento).toBe(2300); // 1000 + 1300
  });
});

describe("dataProvavelPromocao", () => {
  it("promoção ainda este mês quando o potencial restante já cobre a falta", () => {
    const r = dataProvavelPromocao({
      mesCorrente: "2026-07",
      faltaCoins: 400,
      recorrenteJaLancadoNoMesCorrente: 0,
    });
    expect(r.mesAlvo).toBe("2026-07");
    expect(r.mesesAtePromocao).toBe(1);
    expect(r.dataPromocao).toBe("2026-09"); // primeiro checkpoint em ou após julho
  });

  it("projeta meses futuros a 100% da base quando falta mais do que o potencial do mês corrente", () => {
    const r = dataProvavelPromocao({
      mesCorrente: "2026-07",
      faltaCoins: 5000,
      recorrenteJaLancadoNoMesCorrente: 0,
    });
    // potencial=1300, restante=3700, ceil(3700/1300)=3 → mesAlvo = out/2026
    expect(r.mesAlvo).toBe("2026-10");
    expect(r.mesesAtePromocao).toBe(4);
    expect(r.dataPromocao).toBe("2026-12");
  });

  it("considera o quanto já foi lançado no mês corrente ao calcular o potencial restante", () => {
    const r = dataProvavelPromocao({
      mesCorrente: "2026-07",
      faltaCoins: 1000,
      recorrenteJaLancadoNoMesCorrente: 1000, // potencial restante = 300
    });
    // restante = 1000 - 300 = 700, ceil(700/1300) = 1
    expect(r.mesAlvo).toBe("2026-08");
    expect(r.mesesAtePromocao).toBe(2);
    expect(r.dataPromocao).toBe("2026-09");
  });

  it("cai exatamente no limite de um múltiplo de 1.300 sem sobrar mês extra", () => {
    const r = dataProvavelPromocao({
      mesCorrente: "2026-01",
      faltaCoins: 2600,
      recorrenteJaLancadoNoMesCorrente: 0,
    });
    // potencial=1300, restante=1300, ceil(1300/1300)=1
    expect(r.mesAlvo).toBe("2026-02");
    expect(r.mesesAtePromocao).toBe(2);
  });
});
