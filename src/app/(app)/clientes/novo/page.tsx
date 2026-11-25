import { exigirGestao } from "@/lib/auth/sessao";
import { listarClientes } from "@/lib/data/hub";
import { listarAssessoresAtivos } from "@/lib/data/repo";
import { Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";
import { NovoCliente } from "@/components/hub/novo-cliente";

export const metadata = { title: "Novo cliente" };

function distintos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => !!v?.trim()))].sort((a, b) => a.localeCompare(b));
}

export default async function NovoClientePage() {
  const sessao = await exigirGestao();
  // o RLS já devolve só os assessores que esta pessoa pode gerir
  const [assessores, clientes] = await Promise.all([
    listarAssessoresAtivos().catch(() => []),
    listarClientes().catch(() => []),
  ]);

  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href="/clientes">Clientes</Voltar>
      </div>
      <PaginaTopo
        titulo="Novo cliente"
        lede="Cadastre o básico. Em seguida abre o formulário do dossiê, com as perguntas que a coordenação respondia."
      />
      <div className="secao" style={{ marginTop: 36 }}>
        <NovoCliente
          assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))}
          podeSemAssessor={sessao.papel === "diretoria"}
          sugestoes={{
            squads: distintos(clientes.map((c) => c.squad)),
            pacotes: distintos(clientes.map((c) => c.pacote)),
            nichos: distintos(clientes.map((c) => c.nicho)),
          }}
        />
      </div>
    </Cena>
  );
}
