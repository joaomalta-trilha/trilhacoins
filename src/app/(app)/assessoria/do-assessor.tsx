import type { ContextoHub } from "@/lib/hub/contexto";
import { type ClienteRow, MigracaoPendenteError, listarClientes, obterDossiesDe } from "@/lib/data/hub";
import { buscarReunioes } from "@/lib/data/clickup";
import { agoraEmMaceio, montarRotina } from "@/lib/hub/rotina";
import {
  contarClientesComReuniao,
  mesDaTela,
  montarLinhasDeReunioes,
  reunioesPorCliente,
  vencidasDoMes,
} from "@/lib/hub/reunioes";
import { AvisoMigracao, Cena, PaginaTopo } from "@/components/hub/basicos";
import { RotinaDaSemana } from "@/components/hub/rotina-semana";
import { ReunioesDoMes } from "@/components/hub/reunioes-mes";
import {
  AvisoLeituraClickUp,
  CartaoReunioesDoMes,
  ListaVencidas,
  NavMeses,
  contasDoCartao,
} from "@/components/hub/reunioes-partes";
import { SeletorVerComo } from "@/components/hub/ver-como";

/**
 * Assessoria, na experiência do assessor: o trabalho da semana com a
 * carteira. Primeiro a rotina (os ritos de cada cliente, dia a dia), depois
 * as reuniões do mês, lidas do ClickUp. É aqui que entram as próximas
 * rotinas da operação.
 */
export async function AssessoriaDoAssessor({ ctx, pedido }: { ctx: ContextoHub; pedido?: string }) {
  const alvo = ctx.assessorAlvo;
  const agora = new Date();
  const { diaUtil } = agoraEmMaceio(agora);
  const { mes, mesAtual, anterior, seguinte } = mesDaTela(pedido, agora);

  let visiveis: ClienteRow[] = [];
  let migracaoPendente = false;
  try {
    visiveis = await listarClientes();
  } catch (e) {
    if (!(e instanceof MigracaoPendenteError)) throw e;
    migracaoPendente = true;
  }
  const carteira = visiveis.filter((c) => alvo && c.assessorId === alvo.id && c.status !== "saiu");

  const [dossies, leitura] = await Promise.all([
    migracaoPendente ? Promise.resolve(new Map<string, string>()) : obterDossiesDe(carteira.map((c) => c.id)),
    alvo && !migracaoPendente ? buscarReunioes(agora) : Promise.resolve(null),
  ]);

  const rotina = montarRotina(carteira, dossies);
  // o vínculo considera todos os clientes visíveis (um grupo pode ter cliente fora da carteira)
  const { porCliente } = reunioesPorCliente(leitura?.ok ? leitura.reunioes : [], visiveis);
  const linhas = montarLinhasDeReunioes({
    clientes: carteira,
    porCliente,
    dossies,
    nomeDoAssessor: new Map(),
    nomeDaPessoa: new Map(),
    mes,
    agora,
  });
  const conta = contarClientesComReuniao(linhas);
  const { esperadas, cumpridas } = contasDoCartao(linhas);
  const vencidas = vencidasDoMes(porCliente, carteira, mes);

  return (
    <Cena>
      <PaginaTopo
        titulo="Assessoria"
        lede="O trabalho da semana com a carteira: a rotina de cada cliente, dia a dia, e as reuniões do mês, direto da lista 🗣️ Reuniões do ClickUp."
        lado={
          leitura?.ok && conta.clientes > 0 ? (
            <CartaoReunioesDoMes
              conta={conta}
              mes={mes}
              esperadas={esperadas}
              cumpridas={cumpridas}
              vencidas={vencidas.length}
              ehMesAtual={mes === mesAtual}
            />
          ) : undefined
        }
      >
        <SeletorVerComo opcoes={ctx.opcoesVerComo} selecionadoId={alvo?.id ?? null} />
      </PaginaTopo>

      {!alvo && (
        <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
          Seu acesso está liberado, mas ainda não foi vinculado a um assessor. Peça à diretoria para escolher o seu nome em
          Usuários.
        </div>
      )}
      {migracaoPendente && (
        <div style={{ marginTop: 28 }}>
          <AvisoMigracao />
        </div>
      )}

      <RotinaDaSemana hoje={diaUtil} clientes={rotina} />

      {alvo && (
        <section className="reunioes-secao" id="reunioes" aria-labelledby="t-reunioes">
          <div className="reunioes-cab">
            <h2 id="t-reunioes">Reuniões</h2>
            <NavMeses
              caminho="/assessoria"
              ancora="#reunioes"
              mes={mes}
              mesAtual={mesAtual}
              anterior={anterior}
              seguinte={seguinte}
            />
          </div>
          {leitura && !leitura.ok && <AvisoLeituraClickUp motivo={leitura.motivo} detalhe={leitura.detalhe} />}
          {leitura?.ok && <ReunioesDoMes linhas={linhas} gestao={false} lidasEm={leitura.lidasEm} />}
        </section>
      )}

      <ListaVencidas vencidas={vencidas} />
    </Cena>
  );
}
