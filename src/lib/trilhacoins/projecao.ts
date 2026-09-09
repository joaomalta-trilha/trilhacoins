import { BASE_MENSAL } from "./types";
import { mesesEntre, primeiroCheckpointEmOuApos, somarMeses } from "./mes";

/**
 * potencial_mes_corrente = max(0, 1300 − recorrente_já_lançado_no_mês_corrente)
 *
 * Quanto o mês corrente (ainda aberto) ainda pode render de base
 * recorrente. Não é o que já foi lançado — é a capacidade restante.
 */
export function potencialMesCorrente(recorrenteJaLancadoNoMesCorrente: number): number {
  return Math.max(0, BASE_MENSAL - recorrenteJaLancadoNoMesCorrente);
}

/**
 * projetado_no_checkpoint = saldo + potencial_mes_corrente
 *                          + 1300 × meses_entre(mes_corrente, proximo_checkpoint)
 *
 * Sempre a 100% da base recorrente, sem bônus. `saldo` já reflete só
 * apurações fechadas (§5.5); o mês corrente entra apenas pelo que
 * ainda pode render, nunca pelo que já foi lançado nele.
 */
export function projetadoNoCheckpoint(params: {
  saldo: number;
  mesCorrente: string;
  proximoCheckpoint: string;
  recorrenteJaLancadoNoMesCorrente: number;
}): number {
  const potencial = potencialMesCorrente(params.recorrenteJaLancadoNoMesCorrente);
  const mesesFuturos = mesesEntre(params.mesCorrente, params.proximoCheckpoint);
  return params.saldo + potencial + BASE_MENSAL * mesesFuturos;
}

export interface DataProvavelPromocao {
  /** primeiro mês em que o saldo, a 100% da base, cobriria a transição */
  mesAlvo: string;
  /** meses_ate_promocao = meses_entre(mes_corrente, mes_alvo) + 1 */
  mesesAtePromocao: number;
  /** primeiro checkpoint em ou após `mesAlvo` */
  dataPromocao: string;
}

/**
 * Data provável da promoção (§6). Retorna `null` quando não há custo de
 * transição (nível máximo) — nada a projetar.
 *
 * restante = falta_coins − potencial_mes_corrente
 * mes_alvo = restante <= 0 ? mes_corrente : mes_corrente + ceil(restante / 1300) meses
 * meses_ate_promocao = meses_entre(mes_corrente, mes_alvo) + 1
 * data_promocao = primeiro checkpoint em ou após mes_alvo
 */
export function dataProvavelPromocao(params: {
  mesCorrente: string;
  faltaCoins: number;
  recorrenteJaLancadoNoMesCorrente: number;
}): DataProvavelPromocao {
  const potencial = potencialMesCorrente(params.recorrenteJaLancadoNoMesCorrente);
  const restante = params.faltaCoins - potencial;

  const mesAlvo =
    restante <= 0
      ? params.mesCorrente
      : somarMeses(params.mesCorrente, Math.ceil(restante / BASE_MENSAL));

  const mesesAtePromocao = mesesEntre(params.mesCorrente, mesAlvo) + 1;
  const dataPromocao = primeiroCheckpointEmOuApos(mesAlvo);

  return { mesAlvo, mesesAtePromocao, dataPromocao };
}
