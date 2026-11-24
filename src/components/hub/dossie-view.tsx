import type { ReactNode } from "react";
import { ArrowUpRight, BarChart3, Filter, MessageSquare, PlayCircle, TrendingUp, type LucideIcon } from "lucide-react";
import type { ClienteRow } from "@/lib/data/hub";
import {
  DIAS_UTEIS,
  type DiaUtil,
  type Dossie,
  atalhosDoDossie,
  campo,
  lerRotina,
  lerSwot,
  notasDeAcesso,
  resumoDoItem,
  secao,
  separarTarefa,
  secoesDaConta,
  textoDaSecao,
} from "@/lib/hub/dossie";
import { Md, MdInline } from "./markdown";

// Dossiê do cliente em três partes, para a página poder pôr a rotina na
// faixa escura: o essencial e os acessos (claro), a rotina da semana
// (escuro) e a leitura da conta (claro).

const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia útil de hoje no fuso de Maceió (o servidor roda em UTC). */
export function diaUtilDeHoje(): DiaUtil | null {
  const nome = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Maceio" })
    .format(new Date())
    .split("-")[0]
    .toLowerCase();
  const i = NOMES_DIA.indexOf(nome);
  return i >= 1 && i <= 5 ? DIAS_UTEIS[i - 1] : null;
}

function ParesChaveValor({ pares, duas }: { pares: [string, string][]; duas?: boolean }) {
  const visiveis = pares.filter(([, v]) => v && v.trim());
  if (!visiveis.length) return <p className="muted">Ainda não preenchido.</p>;
  return (
    <dl className={`kv${duas ? " duas" : ""}`}>
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

function Bloco({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="card bloco">
      {titulo && <h3>{titulo}</h3>}
      {children}
    </section>
  );
}

const LINKS_ROTINA: [keyof ClienteRow["links"], string, LucideIcon][] = [
  ["relatorio", "Relatório da semana", BarChart3],
  ["funil", "Funil de vendas do site", Filter],
  ["otimizacao", "Otimização da semana", TrendingUp],
  ["checkin", "Check-in do assessor", PlayCircle],
  ["recorrencia", "Mensagens em Feedback", MessageSquare],
];

/** Itens "[ ]" do Markdown viram uma marca desenhada, não texto cru. */
function classeTarefa(texto: string): string | undefined {
  const t = separarTarefa(texto);
  return t.tarefa ? `tarefa${t.feita ? " feita" : ""}` : undefined;
}

/** Quais partes existem neste dossiê (para as pílulas de navegação). */
export function partesDoDossie(d: Dossie): { id: string; rotulo: string }[] {
  const partes = [
    { id: "resumo", rotulo: "Em 30 segundos" },
    { id: "acessos", rotulo: "Acessos" },
    { id: "rotina", rotulo: "Rotina" },
  ];
  if (secao(d, "Cuidados")) partes.push({ id: "cuidados", rotulo: "Cuidados" });
  else if (secao(d, "Resposta específica")) partes.push({ id: "cuidados", rotulo: "Contexto" });
  partes.push({ id: "swot", rotulo: "SWOT" });
  if (secoesDaConta(d).length || secao(d, "Histórico de decisões")) partes.push({ id: "conta", rotulo: "Na conta" });
  return partes;
}

/** O essencial em 30 segundos e as ferramentas de trabalho. */
export function DossieEssencial({ d, md }: { d: Dossie; md: string }) {
  const desafio = textoDaSecao(secao(d, "Desafio"));
  const atalhos = atalhosDoDossie(d, md);
  const notas = notasDeAcesso(d);
  const intro = d.intro.filter((l) => !l.startsWith("**Pede"));

  return (
    <>
      <section className="dossie-secao" id="resumo" aria-labelledby="t-resumo">
        <h2 id="t-resumo">Em 30 segundos</h2>
        {intro.map((l, i) => (
          <p key={i} className="nota" style={{ marginBottom: 12 }}>
            <MdInline texto={l} />
          </p>
        ))}
        <div className="card">
          <ParesChaveValor
            duas
            pares={[
              ["Objetivo", campo(d, "Objetivo")],
              ["Meta", campo(d, "Meta")],
              ["Contato e quem decide", campo(d, "Contato")],
              ["Maior desafio", desafio],
              ["Produtos em campanha", campo(d, "Produtos")],
            ]}
          />
        </div>
      </section>

      <section className="dossie-secao" id="acessos" aria-labelledby="t-acessos">
        <h2 id="t-acessos">Ferramentas e acessos</h2>
        {atalhos.length > 0 && (
          <div className="atalhos" style={{ marginBottom: 16 }}>
            {atalhos.map((a) => (
              <a key={a.url} className="atalho" href={a.url} target="_blank" rel="noopener noreferrer">
                <span className="ic" aria-hidden="true">
                  {a.sigla}
                </span>
                <span className="atalho-texto">
                  <b>{a.nome}</b>
                  <span>{a.descricao}</span>
                </span>
                <ArrowUpRight strokeWidth={1.8} aria-hidden="true" />
              </a>
            ))}
          </div>
        )}
        <div className="grade-2">
          <Bloco titulo="Contas e sistemas">
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
          <Bloco titulo="Verba e pagamento">
            <ParesChaveValor
              pares={[
                ["Meta", campo(d, "Verba mensal no Meta")],
                ["Google", campo(d, "Verba mensal no Google")],
                ["Pagamento", campo(d, "Pagamento")],
              ]}
            />
          </Bloco>
        </div>
        <p className="nota-rodape" style={{ marginTop: 12 }}>
          Senhas não ficam no Hub. Sem acesso a alguma ferramenta? Peça à coordenação.
        </p>
      </section>
    </>
  );
}

/** A rotina da semana em cinco colunas (vai dentro da faixa escura). */
export function DossieRotina({ d, cliente }: { d: Dossie; cliente: ClienteRow }) {
  const rotina = lerRotina(d);
  const hoje = diaUtilDeHoje();
  const links = LINKS_ROTINA.filter(([k]) => cliente.links[k]);

  return (
    <section id="rotina" className="dossie-secao" style={{ marginTop: 0 }} aria-labelledby="t-rotina">
      <div className="secao-cab">
        <h2 id="t-rotina">Rotina da semana</h2>
        {hoje && <span className="cnt">hoje é {hoje.toLowerCase()}</span>}
      </div>
      {links.length > 0 && (
        <div className="links-rotina">
          {links.map(([k, rotulo, Icone]) => (
            <a key={k} href={cliente.links[k]} target="_blank" rel="noopener noreferrer" className="link-tarefa">
              <Icone strokeWidth={1.6} aria-hidden="true" />
              {rotulo}
            </a>
          ))}
        </div>
      )}
      {rotina ? (
        <>
          {rotina.intro.length > 0 && (
            <div className="rotina-intro">
              <Md texto={rotina.intro.join("\n")} />
            </div>
          )}
          <div className="calendario">
            {DIAS_UTEIS.map((dia) => {
              const itens = rotina.dias[dia];
              return (
                <details key={dia} className={`dia${hoje === dia ? " hoje" : ""}`} open={hoje === dia}>
                  <summary>
                    <span className="dia-cab">
                      <span className="dia-nome">{dia}</span>
                      {hoje === dia && <span className="dia-hoje">hoje</span>}
                    </span>
                    <ul className="dia-resumo">
                      {itens.length ? (
                        itens.map((t, i) => (
                          <li key={i} className={classeTarefa(t)}>
                            {resumoDoItem(t)}
                          </li>
                        ))
                      ) : (
                        <li className="muted">Sem rito neste dia.</li>
                      )}
                    </ul>
                    {itens.length > 0 && <span className="dia-mais">ver o detalhe</span>}
                  </summary>
                  {itens.length > 0 && (
                    <ul className="dia-completo">
                      {itens.map((t, i) => (
                        <li key={i} className={classeTarefa(t)}>
                          <MdInline texto={separarTarefa(t).texto} />
                        </li>
                      ))}
                    </ul>
                  )}
                </details>
              );
            })}
          </div>
          {rotina.extras.length > 0 && (
            <div className="grade-2 extras">
              {rotina.extras.map((x) => (
                <details key={x.titulo} className="painel dobra">
                  <summary>{x.titulo}</summary>
                  <Md texto={x.linhas.join("\n")} />
                </details>
              ))}
            </div>
          )}
          {rotina.observacoes.length > 0 && (
            <div className="chips observacoes">
              {rotina.observacoes
                .flatMap((t) => t.split(" · "))
                .map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
            </div>
          )}
        </>
      ) : (
        <p className="vazio-escuro">A rotina deste cliente ainda não foi escrita no dossiê.</p>
      )}
    </section>
  );
}

/** Cuidados, contexto, SWOT e a leitura da conta. */
export function DossieAnalise({ d }: { d: Dossie }) {
  const swot = lerSwot(d);
  const cuidados = secao(d, "Cuidados");
  const contexto = secao(d, "Resposta específica");
  const conta = secoesDaConta(d);
  const historico = secao(d, "Histórico de decisões");

  return (
    <>
      {(cuidados || contexto) && (
        <section className="dossie-secao" id="cuidados" aria-labelledby="t-cuidados">
          <h2 id="t-cuidados">{cuidados ? "Cuidados" : "Contexto"}</h2>
          <div className={cuidados && contexto ? "grade-2" : undefined}>
            {cuidados && (
              <Bloco>
                <Md texto={textoDaSecao(cuidados)} />
              </Bloco>
            )}
            {contexto && (
              <Bloco titulo="Contexto">
                <Md texto={textoDaSecao(contexto)} />
              </Bloco>
            )}
          </div>
        </section>
      )}

      <section className="dossie-secao" id="swot" aria-labelledby="t-swot">
        <h2 id="t-swot">Análise SWOT</h2>
        {swot ? (
          <>
            {swot.notas.length > 0 && (
              <div className="muted" style={{ marginBottom: 14, maxWidth: "80ch" }}>
                <Md texto={swot.notas.join("\n\n")} />
              </div>
            )}
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
            {swot.fontes.length > 0 && (
              <div className="nota-rodape">
                <Md texto={swot.fontes.join("\n\n")} />
              </div>
            )}
          </>
        ) : (
          <div className="vazio">
            <b>SWOT ainda não escrita</b>
            <p>A análise desse cliente ainda vai ser escrita e validada pela coordenação.</p>
          </div>
        )}
      </section>

      {(conta.length > 0 || historico) && (
        <section className="dossie-secao" id="conta" aria-labelledby="t-conta">
          <h2 id="t-conta">Na conta</h2>
          {conta.map((s) => (
            <details key={s.titulo} className="card dobra">
              <summary>{s.titulo}</summary>
              <Md texto={s.linhas.join("\n")} />
            </details>
          ))}
          {historico && (
            <details className="card dobra">
              <summary>Histórico de decisões</summary>
              <Md texto={textoDaSecao(historico)} />
            </details>
          )}
        </section>
      )}
    </>
  );
}
