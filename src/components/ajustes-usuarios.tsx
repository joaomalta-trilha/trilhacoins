"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { atualizarCarteiraAction, atualizarUsuarioAction } from "@/app/actions";
import { atualizarPessoaAction, removerUsuarioAction, restaurarUsuarioAction } from "@/app/hub-actions";
import type { Papel } from "@/lib/auth/sessao";
import { RolagemX } from "./rolagem-x";

interface UsuarioEditavel {
  id: string;
  email: string;
  papel: Papel;
  assessorId: string | null;
  ativo: boolean;
  carteira: string[];
  nome: string | null;
  cargo: string | null;
  clickupUserId: number | null;
  removidoEm: string | null;
}

// O gestor entra como "Diretoria": mesmos acessos. O cargo é o que
// aparece no Hub ("Gerente de Performance", "Diretor", "Coordenadora").
const PAPEIS: { valor: Papel; rotulo: string }[] = [
  { valor: "diretoria", rotulo: "Diretoria / Gestão" },
  { valor: "coordenacao", rotulo: "Coordenação" },
  { valor: "assessor", rotulo: "Assessor" },
];

type Aviso = { tipo: "ok" | "erro"; texto: string } | null;

export function AjustesUsuarios({
  usuarios,
  assessores,
  usuarioAtualId,
}: {
  usuarios: UsuarioEditavel[];
  assessores: { id: string; nome: string }[];
  usuarioAtualId: string;
}) {
  const [aviso, setAviso] = useState<Aviso>(null);
  const visiveis = usuarios.filter((u) => !u.removidoEm);
  const removidos = usuarios.filter((u) => u.removidoEm);
  const pendentes = visiveis.filter((u) => !u.ativo);

  return (
    <div>
      {aviso && (
        <div className={`aviso ${aviso.tipo === "ok" ? "aviso-ok" : "aviso-erro"}`} role="status" style={{ marginBottom: 14 }}>
          {aviso.texto}
        </div>
      )}
      {pendentes.length > 0 && (
        <div className="aviso aviso-atencao" style={{ marginBottom: 14 }}>
          {pendentes.length === 1
            ? "1 pessoa entrou e está esperando aprovação de acesso."
            : `${pendentes.length} pessoas entraram e estão esperando aprovação de acesso.`}
        </div>
      )}
      <div className="card caixa-tabela">
        <RolagemX>
          <table className="tabela tabela-topo" style={{ minWidth: 1080 }}>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Cargo</th>
                <th>Papel</th>
                <th>Assessor(es) vinculado(s)</th>
                <th>ID no ClickUp</th>
                <th>Ativo</th>
                <th aria-label="Remover" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((u) => (
                <LinhaUsuario
                  key={u.id}
                  usuario={u}
                  assessores={assessores}
                  ehVoce={u.id === usuarioAtualId}
                  onAviso={setAviso}
                />
              ))}
            </tbody>
          </table>
        </RolagemX>
      </div>

      {removidos.length > 0 && <Removidos removidos={removidos} onAviso={setAviso} />}
    </div>
  );
}

function LinhaUsuario({
  usuario,
  assessores,
  ehVoce,
  onAviso,
}: {
  usuario: UsuarioEditavel;
  assessores: { id: string; nome: string }[];
  ehVoce: boolean;
  onAviso: (a: Aviso) => void;
}) {
  const router = useRouter();
  const [papel, setPapel] = useState<Papel>(usuario.papel);
  const [assessorId, setAssessorId] = useState(usuario.assessorId ?? "");
  const [carteira, setCarteira] = useState<string[]>(usuario.carteira);
  const [ativo, setAtivo] = useState(usuario.ativo);
  const [nome, setNome] = useState(usuario.nome ?? "");
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [clickup, setClickup] = useState(usuario.clickupUserId ? String(usuario.clickupUserId) : "");
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function executar(acao: () => Promise<{ ok: true } | { ok: false; erro: string }>) {
    setErro(null);
    setSalvo(false);
    startTransition(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else {
        setSalvo(true);
        setTimeout(() => setSalvo(false), 1500);
      }
    });
  }

  const salvar = (patch: Partial<{ papel: Papel; assessorId: string | null; ativo: boolean }>) =>
    executar(() => atualizarUsuarioAction(usuario.id, patch));
  const salvarPessoa = (patch: { nome?: string; cargo?: string; clickupUserId?: string }) =>
    executar(() => atualizarPessoaAction(usuario.id, patch));

  function remover() {
    setErro(null);
    startTransition(async () => {
      const r = await removerUsuarioAction(usuario.id);
      if (!r.ok) {
        setErro(r.erro);
        setConfirmando(false);
        return;
      }
      onAviso({
        tipo: "ok",
        texto:
          r.modo === "excluido"
            ? `${usuario.email} foi removido. Se entrar de novo um dia, aparece aqui como pendente.`
            : `${usuario.email} tem histórico no Coins, então perdeu o acesso e foi para "Removidos" (dá para restaurar).`,
      });
      router.refresh();
    });
  }

  return (
    <tr className={!usuario.ativo && !ativo ? "linha-pendente" : undefined}>
      <td>
        <input
          className="input"
          value={nome}
          placeholder="Nome de exibição"
          aria-label={`Nome de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome !== (usuario.nome ?? "") && salvarPessoa({ nome })}
          style={{ width: 170 }}
        />
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 5 }}>
          {usuario.email}
          {ehVoce && <span className="voce">você</span>}
        </div>
        {erro && <div className="erro-inline">{erro}</div>}
        {salvo && <div className="msg-ok" style={{ fontSize: 11.5, marginTop: 4 }}>salvo</div>}
      </td>
      <td>
        <input
          className="input"
          value={cargo}
          placeholder="Ex.: Coordenadora"
          aria-label={`Cargo de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setCargo(e.target.value)}
          onBlur={() => cargo !== (usuario.cargo ?? "") && salvarPessoa({ cargo })}
          style={{ width: 170 }}
        />
      </td>
      <td>
        <select
          className="input"
          value={papel}
          disabled={pending}
          aria-label={`Papel de ${usuario.email}`}
          onChange={(e) => {
            const novoPapel = e.target.value as Papel;
            setPapel(novoPapel);
            salvar({ papel: novoPapel });
          }}
        >
          {PAPEIS.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </select>
      </td>
      <td>
        {papel === "assessor" && (
          <select
            className="input"
            value={assessorId}
            disabled={pending}
            aria-label={`Assessor vinculado a ${usuario.email}`}
            onChange={(e) => {
              setAssessorId(e.target.value);
              salvar({ assessorId: e.target.value === "" ? null : e.target.value });
            }}
          >
            <option value="">— nenhum —</option>
            {assessores.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        )}
        {papel === "coordenacao" && (
          <div className="escolha-chips" role="group" aria-label={`Carteira de coordenação de ${usuario.email}`}>
            {assessores.map((a) => {
              const marcado = carteira.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  className="chip-escolha"
                  aria-pressed={marcado}
                  disabled={pending}
                  onClick={() => {
                    const nova = marcado ? carteira.filter((x) => x !== a.id) : [...carteira, a.id];
                    setCarteira(nova);
                    executar(() => atualizarCarteiraAction(usuario.id, nova));
                  }}
                >
                  {marcado && <Check strokeWidth={2} aria-hidden="true" />}
                  {a.nome}
                </button>
              );
            })}
          </div>
        )}
        {papel === "diretoria" && <span className="muted">Vê todo mundo</span>}
      </td>
      <td>
        <input
          className="input"
          value={clickup}
          inputMode="numeric"
          placeholder="Só números"
          aria-label={`ID do ClickUp de ${usuario.email}`}
          disabled={pending}
          onChange={(e) => setClickup(e.target.value.replace(/\D/g, ""))}
          onBlur={() =>
            clickup !== (usuario.clickupUserId ? String(usuario.clickupUserId) : "") &&
            salvarPessoa({ clickupUserId: clickup })
          }
          style={{ width: 110 }}
        />
      </td>
      <td>
        <input
          type="checkbox"
          role="switch"
          className="interruptor"
          checked={ativo}
          disabled={pending}
          aria-label={`Acesso de ${usuario.email} ativo`}
          onChange={(e) => {
            setAtivo(e.target.checked);
            salvar({ ativo: e.target.checked });
          }}
        />
      </td>
      <td style={{ whiteSpace: "nowrap" }}>
        {ehVoce ? null : confirmando ? (
          <span
            className="confirmar-remocao"
            // a tabela rola na horizontal: traz a confirmação para a vista
            ref={(el) => el?.scrollIntoView({ block: "nearest", inline: "nearest" })}
          >
            <span>Remover?</span>
            <button type="button" className="btn btn-perigo" disabled={pending} onClick={remover}>
              {pending ? "Removendo…" : "Sim, remover"}
            </button>
            <button type="button" className="btn-link" disabled={pending} onClick={() => setConfirmando(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            className="btn-icone-so"
            disabled={pending}
            onClick={() => setConfirmando(true)}
            aria-label={`Remover ${usuario.email}`}
            title="Remover"
          >
            <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
          </button>
        )}
      </td>
    </tr>
  );
}

function Removidos({ removidos, onAviso }: { removidos: UsuarioEditavel[]; onAviso: (a: Aviso) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function restaurar(u: UsuarioEditavel) {
    startTransition(async () => {
      const r = await restaurarUsuarioAction(u.id);
      if (!r.ok) onAviso({ tipo: "erro", texto: r.erro });
      else {
        onAviso({ tipo: "ok", texto: `${u.email} voltou para a lista, ainda inativo. Marque "Ativo" para liberar o acesso.` });
        router.refresh();
      }
    });
  }

  return (
    <details className="card dobra" style={{ marginTop: 16 }}>
      <summary>Removidos com histórico ({removidos.length})</summary>
      <p className="muted" style={{ fontSize: 13 }}>
        Sem acesso ao Hub e ao Coins. Ficam guardados porque aparecem no histórico (lançamentos, promoções ou log).
      </p>
      <ul className="lista-removidos">
        {removidos.map((u) => (
          <li key={u.id}>
            <span>
              {u.nome ? `${u.nome} · ` : ""}
              {u.email}
              <span className="muted pequeno">
                {" "}
                · removido em {new Date(u.removidoEm as string).toLocaleDateString("pt-BR", { timeZone: "America/Maceio" })}
              </span>
            </span>
            <button type="button" className="btn btn-secundario" disabled={pending} onClick={() => restaurar(u)}>
              Restaurar
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
