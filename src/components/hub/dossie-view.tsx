import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { ClienteRow } from "@/lib/data/hub";
import {
  DIAS_UTEIS,
  type DiaUtil,
  atalhosDoDossie,
  campo,
  lerDossie,
  lerRotina,
  lerSwot,
  notasDeAcesso,
  resumoDoItem,
  secao,
  secoesDaConta,
  textoDaSecao,
} from "@/lib/hub/dossie";
import { Md, MdInline } from "./markdown";

// Dossiê do cliente no mesmo desenho da Trilha do Assessor: o essencial
// em 30 segundos, os atalhos de trabalho, a rotina em calendário, os
// cuidados, a SWOT e a leitura da conta.

const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia útil de hoje no fuso de Maceió (o servidor roda em UTC). */
function diaUtilDeHoje(): DiaUtil | null {
  const nome = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Maceio" })
    .format(new Date())
    .split("-")[0]
    .toLowerCase();
  const i = NOMES_DIA.indexOf(nome);
  return i >= 1 && i <= 5 ? DIAS_UTEIS[i - 1] : null;
}

function ParesChaveValor({ pares }: { pares: [string, string][] }) {
  const visiveis = pares.filter(([, v]) => v && v.trim());
  if (!visiveis.length) return <p className="muted">Ainda não preenchido.</p>;
  return (
    <dl className="kv">
      {visiveis.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>
            <MdInline texto={v} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Bloco({ titulo, tom, children }: { titulo?: string; tom?: "areia" | "laranja" | "verde"; children: ReactNode }) {
  return (
    <section className={`card bloco${tom ? ` tom-${tom}` : ""}`}>
      {titulo && <h3>{titulo}</h3>}
      {children}
    </section>
  );
}

const ROTULOS_LINK: [keyof ClienteRow["links"], string][] = [
  ["relatorio", "📊 Relatório da semana"],
  ["funil", "🔻 Funil de vendas do site"],
  ["otimizacao", "📈 Otimização da semana"],
  ["checkin", "▶️ Check-in do assessor"],
  ["recorrencia", "💬 Mensagens em Feedback"],
];

export function DossieView({ cliente, md }: { cliente: ClienteRow; md: string }) {
  const d = lerDossie(md);
  const desafio = textoDaSecao(secao(d, "Desafio"));
  const atalhos = atalhosDoDossie(d, md);
  const notas = notasDeAcesso(d);
  const rotina = lerRotina(d);
  const swot = lerSwot(d);
  const hoje = diaUtilDeHoje();
  const cuidados = secao(d, "Cuidados");
  const contexto = secao(d, "Resposta específica");
  const conta = secoesDaConta(d);
  const historico = secao(d, "Histórico de decisões");
  const linksRotina = ROTULOS_LINK.filter(([k]) => cliente.links[k]);

  return (
    <div className="dossie">
      {d.intro
        .filter((l) => !l.startsWith("**Pede"))
        .map((l, i) => (
          <p key={i} className="nota">
            <MdInline texto={l} />
          </p>
        ))}

      <Bloco titulo="Em 30 segundos">
        <ParesChaveValor
          pares={[
            ["Objetivo", campo(d, "Objetivo")],
            ["Meta", campo(d, "Meta")],
            ["Contato e quem decide", campo(d, "Contato")],
            ["Maior desafio", desafio],
            ["Produtos em campanha", campo(d, "Produtos")],
          ]}
        />
      </Bloco>

      {atalhos.length > 0 && (
        <>
          <h2>Ferramentas e acessos</h2>
          <div className="atalhos">
            {atalhos.map((a) => (
              <a key={a.url} className="atalho" href={a.url} target="_blank" rel="noopener noreferrer">
                <span className="atalho-sigla" aria-hidden="true">
                  {a.sigla}
                </span>
                <span className="atalho-texto">
                  <b>{a.nome}</b>
                  <span>{a.descricao}</span>
                </span>
                <ExternalLink size={14} strokeWidth={1.6} aria-hidden="true" />
              </a>
            ))}
          </div>
        </>
      )}

      <div className="grade-2">
        <Bloco titulo="Contas e sistemas" tom="areia">
          <ParesChaveValor
            pares={[
              ["Canais", campo(d, "Canais")],
              ["Contas", campo(d, "Contas")],
              ["Conta Meta", campo(d, "Conta Meta")],
              ["CRM", campo(d, "CRM")],
              ["Eventos no Meta", campo(d, "Funil")],
              ...notas.map((n): [string, string] => {
                const k = n.split(":")[0];
                return k.length < 30 && n.includes(":") ? [k, n.slice(k.length + 1).trim()] : ["Acesso", n];
              }),
            ]}
          />
        </Bloco>
        <Bloco titulo="Verba e pagamento" tom="areia">
          <ParesChaveValor
            pares={[
              ["Meta", campo(d, "Verba mensal no Meta")],
              ["Google", campo(d, "Verba mensal no Google")],
              ["Pagamento", campo(d, "Pagamento")],
            ]}
          />
        </Bloco>
      </div>
      <p className="muted pequeno">Senhas não ficam no Hub. Sem acesso a alguma ferramenta? Peça à coordenação.</p>

      <h2>Rotina do cliente</h2>
      {linksRotina.length > 0 && (
        <div className="links-rotina">
          {linksRotina.map(([k, rotulo]) => (
            <a key={k} href={cliente.links[k]} target="_blank" rel="noopener noreferrer" className="link-tarefa">
              {rotulo}
            </a>
          ))}
        </div>
      )}
      {rotina ? (
        <>
          {rotina.intro.length > 0 && <Md texto={rotina.intro.join("\n")} className="muted" />}
          <div className="calendario">
            {DIAS_UTEIS.map((dia) => (
              <details key={dia} className={`dia${hoje === dia ? " hoje" : ""}`} open={hoje === dia}>
                <summary>
                  <span className="dia-nome">{dia}</span>
                  {hoje === dia && <span className="dia-hoje">hoje</span>}
                  <ul className="dia-resumo">
                    {rotina.dias[dia].length ? (
                      rotina.dias[dia].map((t, i) => <li key={i}>{resumoDoItem(t)}</li>)
                    ) : (
                      <li className="muted">Sem rito neste dia.</li>
                    )}
                  </ul>
                </summary>
                {rotina.dias[dia].length > 0 && (
                  <ul className="dia-completo">
                    {rotina.dias[dia].map((t, i) => (
                      <li key={i}>
                        <MdInline texto={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            ))}
          </div>
          {rotina.extras.length > 0 && (
            <div className="grade-2">
              {rotina.extras.map((x, i) => (
                <details key={x.titulo} className={`card dobra tom-${i % 2 ? "laranja" : "verde"}`}>
                  <summary>{x.titulo}</summary>
                  <Md texto={x.linhas.join("\n")} />
                </details>
              ))}
            </div>
          )}
          {rotina.observacoes.length > 0 && (
            <div className="chips">
              {rotina.observacoes.flatMap((t) => t.split(" · ")).map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        <Bloco>
          <p className="muted">Rotina ainda não escrita.</p>
        </Bloco>
      )}

      {cuidados && (
        <Bloco titulo="Cuidados" tom="laranja">
          <Md texto={textoDaSecao(cuidados)} />
        </Bloco>
      )}
      {contexto && (
        <Bloco titulo="Contexto">
          <Md texto={textoDaSecao(contexto)} />
        </Bloco>
      )}

      <h2>Análise SWOT</h2>
      {swot ? (
        <>
          {swot.notas.length > 0 && <Md texto={swot.notas.join("\n\n")} className="muted pequeno" />}
          <div className="swot">
            {(
              [
                ["Forças", swot.forcas, "forcas"],
                ["Fraquezas", swot.fraquezas, "fraquezas"],
                ["Oportunidades", swot.oportunidades, "oportunidades"],
                ["Ameaças", swot.ameacas, "ameacas"],
              ] as const
            ).map(([titulo, linhas, cls]) => (
              <div key={titulo} className={`swot-q ${cls}`}>
                <h3>{titulo}</h3>
                <Md texto={linhas.length ? linhas.join("\n") : "Ainda não escrito."} />
              </div>
            ))}
          </div>
          {swot.fontes.length > 0 && <Md texto={swot.fontes.join("\n\n")} className="muted pequeno" />}
        </>
      ) : (
        <Bloco tom="areia">
          <p className="muted">A análise SWOT desse cliente ainda vai ser escrita e validada pela coordenação.</p>
        </Bloco>
      )}

      {conta.length > 0 && (
        <>
          <h2>Na conta</h2>
          {conta.map((s) => (
            <details key={s.titulo} className="card dobra">
              <summary>{s.titulo}</summary>
              <Md texto={s.linhas.join("\n")} />
            </details>
          ))}
        </>
      )}

      {historico && (
        <details className="card dobra">
          <summary>Histórico de decisões</summary>
          <Md texto={textoDaSecao(historico)} />
        </details>
      )}
    </div>
  );
}
