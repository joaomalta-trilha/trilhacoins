import { mesAtualChave, primeiroCheckpointEmOuApos } from "./mes";
import { nivelPorCodigo, proximoNivel, requisitoMacroDoNivel } from "./niveis";
import {
  type ApuracaoFechada,
  type PromocaoEfetivada,
  aptoPorSaldo as calcAptoPorSaldo,
  calcularSaldo,
  faltaCoins as calcFaltaCoins,
  pctNivel as calcPctNivel,
} from "./saldo";
import {
  dataProvavelPromocao,
  potencialMesCorrente as calcPotencialMesCorrente,
  projetadoNoCheckpoint,
} from "./projecao";
import { type MesLancado, aproveitamento, mediaMensal } from "./metricas";

export interface EntradaPainelAssessor {
  saldoInicial: number;
  nivelAtual: string;
  /** apurações com status "fechada" — únicas que contam para o saldo (§5.5) */
  apuracoesFechadas: ApuracaoFechada[];
  promocoesEfetivadas: PromocaoEfetivada[];
  /**
   * coins recorrentes já lançados no mês corrente (ainda aberto).
   * 0 quando o mês corrente não tem lançamento algum.
   */
  recorrenteJaLancadoNoMesCorrente: number;
  /** flag marcada pela diretoria (§5.4) — irrelevante se o nível não exige requisito */
  requisitoMacroAtendido?: boolean;
  hoje?: Date;
}

export interface ResultadoPainelAssessor {
  saldo: number;
  nivelAtual: string;
  proximoNivel: string | null;
  custoProximaTransicao: number | null;
  faltaCoins: number;
  pctNivel: number;
  aptoPorSaldo: boolean;
  /** descrição do requisito qualitativo pendente para este nível, se houver (§5.4) */
  requisitoMacro: string | null;
  requisitoMacroAtendido: boolean;
  /** saldo suficiente E (sem requisito macro OU requisito já atendido) */
  aptoParaPromover: boolean;
  mesCorrente: string;
  proximoCheckpoint: string;
  potencialMesCorrente: number;
  projetadoNoCheckpoint: number;
  mesesAtePromocao: number | null;
  checkpointProvavel: string | null;
  totalGanho: number;
  totalGasto: number;
  mediaMensal: number;
  aproveitamento: number;
}

/** Motor de cálculo completo do painel de um assessor (§6, §8.2). */
export function calcularPainelAssessor(
  entrada: EntradaPainelAssessor
): ResultadoPainelAssessor {
  const hoje = entrada.hoje ?? new Date();
  const mesCorrente = mesAtualChave(hoje);

  const nivel = nivelPorCodigo(entrada.nivelAtual);
  const proximo = proximoNivel(entrada.nivelAtual);
  const custo = nivel.custoPromocao;

  const saldo = calcularSaldo({
    saldoInicial: entrada.saldoInicial,
    apuracoesFechadas: entrada.apuracoesFechadas,
    promocoesEfetivadas: entrada.promocoesEfetivadas,
  });

  const falta = calcFaltaCoins(saldo, custo);
  const pctN = calcPctNivel(saldo, custo);
  const aptoSaldo = calcAptoPorSaldo(saldo, custo);

  const requisitoMacro = requisitoMacroDoNivel(entrada.nivelAtual);
  const requisitoAtendido = entrada.requisitoMacroAtendido ?? false;
  const aptoParaPromover = aptoSaldo && (!requisitoMacro || requisitoAtendido);

  const proximoCheckpoint = primeiroCheckpointEmOuApos(mesCorrente);

  const potencial = calcPotencialMesCorrente(entrada.recorrenteJaLancadoNoMesCorrente);

  const projetado = projetadoNoCheckpoint({
    saldo,
    mesCorrente,
    proximoCheckpoint,
    recorrenteJaLancadoNoMesCorrente: entrada.recorrenteJaLancadoNoMesCorrente,
  });

  let mesesAtePromocao: number | null = null;
  let checkpointProvavel: string | null = null;
  if (custo !== null && falta > 0) {
    const projecao = dataProvavelPromocao({
      mesCorrente,
      faltaCoins: falta,
      recorrenteJaLancadoNoMesCorrente: entrada.recorrenteJaLancadoNoMesCorrente,
    });
    mesesAtePromocao = projecao.mesesAtePromocao;
    checkpointProvavel = projecao.dataPromocao;
  }

  const totalGanho = entrada.apuracoesFechadas.reduce(
    (s, a) => s + a.coinsRecorrente + a.coinsBonus,
    0
  );
  const totalGasto = entrada.promocoesEfetivadas.reduce((s, p) => s + p.custo, 0);

  const mesesLancados: MesLancado[] = entrada.apuracoesFechadas;
  const ultimos3 = mesesLancados.slice(-3);

  return {
    saldo,
    nivelAtual: entrada.nivelAtual,
    proximoNivel: proximo?.codigo ?? null,
    custoProximaTransicao: custo,
    faltaCoins: falta,
    pctNivel: pctN,
    aptoPorSaldo: aptoSaldo,
    requisitoMacro,
    requisitoMacroAtendido: requisitoAtendido,
    aptoParaPromover,
    mesCorrente,
    proximoCheckpoint,
    potencialMesCorrente: potencial,
    projetadoNoCheckpoint: projetado,
    mesesAtePromocao,
    checkpointProvavel,
    totalGanho,
    totalGasto,
    mediaMensal: mediaMensal(ultimos3),
    aproveitamento: aproveitamento(mesesLancados),
  };
}
