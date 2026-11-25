import { Cena, PaginaTopo, Voltar } from "@/components/hub/basicos";

// O RLS devolve "nada" tanto para cliente excluído quanto para dossiê não
// liberado: a mensagem cobre os dois casos sem confirmar que o cliente existe.
export default function ClienteNaoEncontrado() {
  return (
    <Cena>
      <div className="acoes-topo">
        <Voltar href="/clientes">Clientes</Voltar>
      </div>
      <PaginaTopo
        titulo="Cliente não encontrado"
        lede="Ele pode ter sido excluído, ou o dossiê dele não está liberado para você. Se precisar ver, peça à gestão."
      />
    </Cena>
  );
}
