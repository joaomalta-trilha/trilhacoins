import { exigirGestao } from "@/lib/auth/sessao";
import { type ClienteRow, MigracaoPendenteError, listarClientes, listarOpcoesClickUp } from "@/lib/data/hub";
import { sugerirOpcao } from "@/lib/hub/clickup";
import { AvisoMigracao, Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";
import { type LinhaVinculo, VinculoClickUp } from "@/components/hub/vinculo-clickup";

export const metadata = { title: "Vínculo com o ClickUp" };

/**
 * Vínculo com o ClickUp: cada cliente do Hub ligado à opção dele no campo
 * "Clientes". É por essa opção que reuniões, check-ins e tarefas chegam ao
 * cliente certo, nunca pelo nome da tarefa.
 */
export default async function VinculoClickUpPage() {
  await exigirGestao();

  let clientes: ClienteRow[];
  let opcoes: { id: string; nome: string }[];
  try {
    [clientes, opcoes] = await Promise.all([listarClientes(), listarOpcoesClickUp()]);
  } catch (e) {
    if (e instanceof MigracaoPendenteError) {
      return (
        <Cena>
          <div className="acoes-topo">
            <Voltar href="/clientes">Clientes</Voltar>
          </div>
          <PaginaTopo titulo="Vínculo com o ClickUp" />
          <div style={{ marginTop: 28 }}>
            <AvisoMigracao />
          </div>
        </Cena>
      );
    }
    throw e;
  }

  const existe = new Set(opcoes.map((o) => o.id));
  const porOpcao = new Map<string, string[]>();
  for (const c of clientes) {
    if (c.clickupClienteOpcao) porOpcao.set(c.clickupClienteOpcao, [...(porOpcao.get(c.clickupClienteOpcao) ?? []), c.nome]);
  }

  const linhas: LinhaVinculo[] = clientes.map((c) => {
    const sugestao = c.clickupClienteOpcao ? null : sugerirOpcao(c.nome, opcoes);
    return {
      id: c.id,
      slug: c.slug,
      nome: c.nome,
      inativo: c.status === "saiu",
      opcaoId: c.clickupClienteOpcao,
      opcaoSumiu: !!c.clickupClienteOpcao && !existe.has(c.clickupClienteOpcao),
      compartilhaCom: c.clickupClienteOpcao
        ? (porOpcao.get(c.clickupClienteOpcao) ?? []).filter((n) => n !== c.nome)
        : [],
      sugestao: sugestao ? { id: sugestao.opcao.id, nome: sugestao.opcao.nome.trim() } : null,
    };
  });
  const ligados = linhas.filter((l) => l.opcaoId).length;

  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href="/clientes">Clientes</Voltar>
      </div>
      <PaginaTopo
        titulo="Vínculo com o ClickUp"
        lede={`Toda tarefa de cliente no ClickUp (reunião, check-in, entrega) traz o cliente no campo Clientes. Aqui cada cliente do Hub fica ligado à opção dele nesse campo: é por ela, e não pelo nome da tarefa, que as reuniões chegam ao cliente certo. ${ligados} de ${linhas.length} clientes ligados.`}
      />
      {opcoes.length === 0 && (
        <div className="aviso aviso-atencao" style={{ marginTop: 28 }}>
          O banco ainda não tem as opções do campo Clientes do ClickUp. Rode a carga do vínculo no Supabase.
        </div>
      )}
      <VinculoClickUp linhas={linhas} opcoes={opcoes} />
    </Cena>
  );
}
