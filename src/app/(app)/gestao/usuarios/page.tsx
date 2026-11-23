import { exigirDiretoria } from "@/lib/auth/sessao";
import { listarAssessores, listarUsuarios } from "@/lib/data/repo";
import { AjustesUsuarios } from "@/components/ajustes-usuarios";

export default async function UsuariosPage() {
  await exigirDiretoria();
  const [usuarios, assessores] = await Promise.all([listarUsuarios(), listarAssessores()]);

  return (
    <>
      <header className="pagina-topo">
        <p className="rotulo">Gestão</p>
        <h1>Usuários e papéis</h1>
        <p className="lede">
          Quem entra pela primeira vez aparece aqui inativo. Escolha o papel, vincule ao assessor (ou à carteira, para
          coordenação) e marque ativo. O gestor entra como <strong>Diretoria / Gestão</strong>, com os mesmos acessos da
          diretoria; o cargo é só o nome que aparece no Hub.
        </p>
      </header>
      <AjustesUsuarios usuarios={usuarios} assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))} />
      <p className="nota-rodape">
        O ID do ClickUp liga a pessoa às tarefas dela quando a integração entrar (fase 3). Ele aparece no perfil do
        ClickUp, na URL do usuário.
      </p>
    </>
  );
}
