import { exigirDiretoria } from "@/lib/auth/sessao";
import { listarAssessores, listarUsuarios } from "@/lib/data/repo";
import { AjustesUsuarios } from "@/components/ajustes-usuarios";
import { Cena, PaginaTopo } from "@/components/hub/basicos";

export const metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const sessao = await exigirDiretoria();
  const [usuarios, assessores] = await Promise.all([listarUsuarios(), listarAssessores()]);

  return (
    <Cena>
      <PaginaTopo
        titulo="Usuários e papéis"
        lede={
          <>
            Quem entra pela primeira vez aparece aqui inativo. Escolha o papel, vincule ao assessor (ou à carteira, para
            coordenação) e marque ativo. O gestor entra como <strong>Diretoria / Gestão</strong>, com os mesmos acessos da
            diretoria; o cargo é só o nome que aparece no Hub.
          </>
        }
      />
      <div style={{ marginTop: 36 }}>
        <AjustesUsuarios
          usuarios={usuarios}
          assessores={assessores.map((a) => ({ id: a.id, nome: a.nome }))}
          usuarioAtualId={sessao.id}
        />
      </div>
      <p className="nota-rodape">
        O ID do ClickUp liga a pessoa às tarefas dela quando a integração entrar (fase 3). Ele aparece no perfil do
        ClickUp, na URL do usuário.
      </p>
      <p className="nota-rodape">
        Remover tira o acesso ao Hub e ao Coins. Quem não tem histórico é apagado de vez (se entrar de novo, volta como
        pendente); quem tem histórico no Coins vai para &quot;Removidos&quot; e pode ser restaurado. O cadastro de
        assessor no Coins não é apagado: para tirá-lo das telas, desmarque &quot;ativo&quot; em Coins → Ajustes.
      </p>
    </Cena>
  );
}
