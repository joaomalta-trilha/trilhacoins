import Link from "next/link";
import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/hub/contexto";
import {
  type ClienteRow,
  MigracaoPendenteError,
  diretorioAssessores,
  diretorioPessoas,
  listarClientes,
  listarOpcoesClickUp,
  obterDossiesDe,
} from "@/lib/data/hub";
import { buscarReunioes } from "@/lib/data/clickup";
import {
  contarClientesComReuniao,
  mesDaTela,
  mesDe,
  montarLinhasDeReunioes,
  reunioesPorCliente,
  vencidasDoMes,
} from "@/lib/hub/reunioes";
import { AvisoMigracao, Cena, PaginaTopo } from "@/components/hub/basicos";
import { ReunioesDoMes } from "@/components/hub/reunioes-mes";
import {
  AvisoLeituraClickUp,
  CartaoReunioesDoMes,
  ListaVencidas,
  NavMeses,
  contasDoCartao,
} from "@/components/hub/reunioes-partes";

export const metadata = { title: "Reuniões" };

/**
 * Reuniões com os clientes, mês a mês, lidas da lista 🗣️ Reuniões do
 * ClickUp: a visão da gestão, por squad e assessor. O assessor vê as
 * reuniões da carteira dele na Assessoria.
 */
export default async function ReunioesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/");
  const { mes: pedido } = await searchParams;
  if (ctx.modo === "assessor") redirect(`/assessoria${pedido ? `?mes=${encodeURIComponent(pedido)}` : ""}#reunioes`);

  const agora = new Date();
  const { mes, mesAtual, anterior, seguinte } = mesDaTela(pedido, agora);

  let clientes: ClienteRow[];
  let nomes: Map<string, string>;
  try {
    [clientes, nomes] = await Promise.all([
      listarClientes(),
      diretorioAssessores().then((l) => new Map(l.map((a) => [a.id, a.nome]))),
    ]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <PaginaTopo titulo="Reuniões" />
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }

  const daTela = clientes.filter((c) => c.status !== "saiu");
  const [dossies, leitura, pessoas, opcoes] = await Promise.all([
    obterDossiesDe(daTela.map((c) => c.id)),
    buscarReunioes(agora),
    diretorioPessoas().catch(() => []),
    listarOpcoesClickUp().catch(() => []),
  ]);

  // o vínculo considera todos os clientes visíveis (um grupo pode ter cliente fora da tela)
  const { porCliente, semCliente } = reunioesPorCliente(leitura.ok ? leitura.reunioes : [], clientes);
  const linhas = montarLinhasDeReunioes({
    clientes: daTela,
    porCliente,
    dossies,
    nomeDoAssessor: nomes,
    nomeDaPessoa: new Map(pessoas.map((p) => [p.id, p.nome])),
    mes,
    agora,
  });
  const conta = contarClientesComReuniao(linhas);
  const { esperadas, cumpridas } = contasDoCartao(linhas);
  const vencidas = vencidasDoMes(porCliente, daTela, mes);

  // reuniões do mês de clientes que o Hub não tem (ou que não estão ligados)
  const nomeDaOpcao = new Map(opcoes.map((o) => [o.id, o.nome]));
  const foraDoHub = new Map<string, number>();
  for (const r of semCliente) {
    if (!r.data || mesDe(new Date(r.data)) !== mes || r.situacao === "cancelada") continue;
    const chave = (r.opcaoCliente && nomeDaOpcao.get(r.opcaoCliente)) || r.nome;
    foraDoHub.set(chave, (foraDoHub.get(chave) ?? 0) + 1);
  }

  return (
    <Cena>
      <PaginaTopo
        titulo="Reuniões"
        lede="Reuniões com os clientes, direto da lista 🗣️ Reuniões do ClickUp. A conta compara as reuniões feitas com a frequência combinada no dossiê de cada cliente."
        lado={
          leitura.ok && conta.clientes > 0 ? (
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
        <div className="sub-row">
          <NavMeses caminho="/reunioes" mes={mes} mesAtual={mesAtual} anterior={anterior} seguinte={seguinte} />
        </div>
      </PaginaTopo>

      {!leitura.ok && <AvisoLeituraClickUp motivo={leitura.motivo} detalhe={leitura.detalhe} />}

      {/* sem leitura do ClickUp não há o que contar: melhor não mostrar todo mundo como "falta reunião" */}
      {leitura.ok && <ReunioesDoMes linhas={linhas} gestao lidasEm={leitura.lidasEm} />}

      <ListaVencidas vencidas={vencidas} />

      {foraDoHub.size > 0 && (
        <section className="reunioes-secao" aria-labelledby="t-fora">
          <h2 id="t-fora">Reuniões de quem não está no Hub</h2>
          <p className="secao-lede">
            O campo Clientes dessas reuniões aponta para uma opção que nenhum cliente do Hub usa. Se é cliente, cadastre em Novo
            cliente e ligue em <Link href="/clientes/clickup">Vínculo com o ClickUp</Link>.
          </p>
          <div className="chips">
            {[...foraDoHub.entries()]
              .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
              .map(([nome, n]) => (
                <span key={nome} className="chip chip-borda">
                  {nome} · {n} {n === 1 ? "reunião" : "reuniões"}
                </span>
              ))}
          </div>
        </section>
      )}
    </Cena>
  );
}
