#!/usr/bin/env python3
"""
Gera os SQLs de importação do Trilha Hub a partir da Trilha do Assessor
(artifact) salva em data/trilha-do-assessor/:

  clientes/index.json  -> clientes (cadastro, carteira, nota de exigência, atalhos)
  clientes/*.md        -> dossies (Markdown, um por cliente)
  index.html           -> conteudos (páginas de processos e cultura)

Saída em data/seed/ (fora do git: tem nome de cliente e dado interno).
Rode da raiz do projeto:  python3 -I scripts/importacao/gerar_seed.py

Os INSERTs usam ON CONFLICT DO NOTHING: rodar de novo nunca apaga o que
foi editado no Hub. Para reimportar um cliente, apague a linha antes.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
ORIGEM = RAIZ / "data" / "trilha-do-assessor"
DESTINO = RAIZ / "data" / "seed"
TAG = "$md_trilha_hub$"
HOJE = dt.date.today().isoformat()

# Trava contra texto colado com a codificação errada (ex.: "é" virando "√©"):
# compara um literal acentuado com o mesmo texto escrito só em ASCII. Se não
# bater, o script para antes de gravar qualquer coisa.
TRAVA = """-- Trava de segurança: se os acentos chegaram quebrados na colagem, nada é gravado.
do $trava$
begin
  if 'ação é' <> U&'a\\00E7\\00E3o \\00E9' then
    raise exception 'Os acentos chegaram quebrados na colagem. Nada foi gravado: avise o Claude.';
  end if;
end
$trava$;
"""


def sql_texto(v: str | None) -> str:
    if v is None or v == "":
        return "null"
    return "'" + v.replace("'", "''") + "'"


def sql_md(texto: str) -> str:
    if TAG in texto:
        raise SystemExit(f"O texto contém o marcador {TAG}; troque o TAG no script.")
    return f"{TAG}{texto}{TAG}"


# ---------------------------------------------------------------
# clientes
# ---------------------------------------------------------------
STATUS = {"ativo": "ativo", "pausado": "pausado", "saiu": "saiu"}
CHAVES_LINK = ["relatorio", "otimizacao", "checkin", "recorrencia", "funil"]
ACENTOS_DE, ACENTOS_PARA = "áàâãäéèêëíìîïóòôõöúùûüçñ", "aaaaaeeeeiiiiooooouuuucn"


def gerar_clientes(indice: list[dict]) -> str:
    linhas = []
    for c in indice:
        links = {k: v for k, v in (c.get("links") or {}).items() if k in CHAVES_LINK and str(v).startswith("http")}
        pts = c.get("pts")
        pts = pts if isinstance(pts, int) and 7 <= pts <= 25 else None
        squad = (c.get("squad") or "").strip().capitalize() or None
        linhas.append(
            "  ("
            + ", ".join(
                [
                    sql_texto(c["slug"]),
                    sql_texto(c["nome"].strip()),
                    sql_texto(STATUS.get((c.get("status") or "ativo").strip().lower(), "ativo")) + "::status_cliente",
                    sql_texto(c.get("assessor")),
                    sql_texto(squad),
                    sql_texto(c.get("pacote")),
                    sql_texto(c.get("frase")),
                    sql_texto(c.get("objetivo")),
                    "true" if c.get("risco") else "false",
                    "true" if c.get("piloto") else "false",
                    "null" if pts is None else str(pts),
                    sql_texto(json.dumps(links, ensure_ascii=False)) + "::jsonb",
                ]
            )
            + ")"
        )
    return f"""-- Trilha Hub · importação de clientes ({HOJE})
-- Origem: clientes/index.json da Trilha do Assessor ({len(indice)} clientes).
-- Rode DEPOIS de supabase/migrations/0007_hub_fundacao.sql.

{TRAVA}
insert into clientes (slug, nome, status, assessor_importado, squad, pacote, frase, objetivo,
                      pede_atencao, piloto_assistente, exigencia_pts, links)
values
{(","+chr(10)).join(linhas)}
on conflict (slug) do nothing;

{sql_vinculo()}"""


def sql_vinculo() -> str:
    norm = (
        "regexp_replace(translate(lower({x}), '"
        + ACENTOS_DE
        + "', '"
        + ACENTOS_PARA
        + "'), '[^a-z0-9]+', ' ', 'g')"
    )
    return f"""-- Vincula cada cliente ao assessor do TrilhaCoins pelo nome: primeiro o
-- nome completo; se não casar, o primeiro nome (só quando é único).
-- Quem não casar fica "sem assessor vinculado" para a gestão escolher.
with norm as (
  select id, trim({norm.format(x="nome")}) as n from assessores where ativo
), unicos as (
  select split_part(n, ' ', 1) as p, (array_agg(id))[1] as id
  from norm group by split_part(n, ' ', 1) having count(*) = 1
), alvo as (
  select c.id, trim({norm.format(x="c.assessor_importado")}) as n
  from clientes c where c.assessor_id is null and c.assessor_importado is not null
)
update clientes c
set assessor_id = coalesce(
  (select norm.id from norm where norm.n = alvo.n limit 1),
  (select unicos.id from unicos where unicos.p = split_part(alvo.n, ' ', 1))
)
from alvo
where alvo.id = c.id;

-- Conferência: quem ficou sem assessor (vincule em Clientes → Editar).
select slug, nome, assessor_importado from clientes where assessor_id is null order by nome;
"""


def gerar_correcao_acentos(indice: list[dict]) -> str:
    """Regrava os textos dos clientes já importados (caso tenham chegado com acento quebrado)."""
    linhas = []
    for c in indice:
        squad = (c.get("squad") or "").strip().capitalize() or None
        linhas.append(
            "  ("
            + ", ".join(
                sql_texto(v)
                for v in [c["slug"], c["nome"].strip(), c.get("frase"), c.get("objetivo"), c.get("pacote"), squad, c.get("assessor")]
            )
            + ")"
        )
    migracao = (RAIZ / "supabase" / "migrations" / "0007_hub_fundacao.sql").read_text(encoding="utf-8")
    inicio = migracao.index("create or replace function public.clientes_antes_de_salvar()")
    gatilho = migracao[inicio : migracao.index("$$;", inicio) + 3]
    return f"""-- Trilha Hub · correção dos acentos dos clientes ({HOJE})
-- Regrava nome, frase, objetivo, pacote, squad e assessor importado dos
-- {len(indice)} clientes com o texto certo. Não mexe em assessor vinculado,
-- nota de exigência, atalhos nem em nada editado no Hub além desses textos.

{TRAVA}
update clientes c set
  nome = v.nome,
  frase = v.frase,
  objetivo = v.objetivo,
  pacote = v.pacote,
  squad = v.squad,
  assessor_importado = v.assessor_importado
from (values
{(","+chr(10)).join(linhas)}
) as v(slug, nome, frase, objetivo, pacote, squad, assessor_importado)
where c.slug = v.slug;

-- Mensagem do gatilho com o acento certo (caso a migration também tenha
-- sido colada com acento quebrado).
{gatilho}

-- Conferência: as duas contagens devem dar 0.
select
  (select count(*) from clientes where nome like '%√%' or frase like '%√%' or objetivo like '%√%') as textos_quebrados,
  (select count(*) from clientes where slug not in ({", ".join(sql_texto(c["slug"]) for c in indice)})) as clientes_desconhecidos;
"""


def gerar_vinculo(indice: list[dict]) -> str:
    return f"""-- Trilha Hub · vincular clientes aos assessores ({HOJE})
-- Rode depois de cadastrar assessores novos no Trilha Coins.
-- Só preenche quem ainda está sem assessor; não mexe em vínculos feitos no Hub.

{TRAVA}
{sql_vinculo()}"""


def gerar_dossies(indice: list[dict], pasta: Path) -> list[str]:
    slugs = {c["slug"] for c in indice}
    arquivos = sorted(pasta.glob("*.md"))
    sem_cliente = [a.stem for a in arquivos if a.stem not in slugs]
    if sem_cliente:
        print("Aviso: dossiês sem cliente no índice:", ", ".join(sem_cliente), file=sys.stderr)
    blocos = []
    for a in arquivos:
        if a.stem not in slugs:
            continue
        md = a.read_text(encoding="utf-8").strip() + "\n"
        blocos.append(
            f"insert into dossies (cliente_id, conteudo_md)\n"
            f"select id, {sql_md(md)}\nfrom clientes where slug = {sql_texto(a.stem)}\n"
            f"on conflict (cliente_id) do nothing;\n"
        )
    partes, atual, tamanho = [], [], 0
    for b in blocos:
        if atual and tamanho + len(b) > 120_000:
            partes.append(atual)
            atual, tamanho = [], 0
        atual.append(b)
        tamanho += len(b)
    if atual:
        partes.append(atual)
    total = len(partes)
    return [
        f"-- Trilha Hub · dossiês, parte {i} de {total} ({HOJE})\n"
        f"-- Rode depois de 10_clientes.sql. Rodar de novo não sobrescreve edições feitas no Hub.\n\n{TRAVA}\n" + "\n".join(p)
        for i, p in enumerate(partes, 1)
    ]


# ---------------------------------------------------------------
# conteúdos: HTML da Trilha do Assessor -> Markdown
# ---------------------------------------------------------------
class No:
    def __init__(self, tag: str, attrs: dict[str, str]):
        self.tag, self.attrs, self.filhos = tag, attrs, []

    @property
    def classes(self) -> set[str]:
        return set((self.attrs.get("class") or "").split())


VAZIAS = {"br", "img", "input", "meta", "link", "hr", "path"}


class Arvore(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.raiz = No("raiz", {})
        self.pilha = [self.raiz]

    def handle_starttag(self, tag, attrs):
        n = No(tag, {k: (v or "") for k, v in attrs})
        self.pilha[-1].filhos.append(n)
        if tag not in VAZIAS:
            self.pilha.append(n)

    def handle_endtag(self, tag):
        for i in range(len(self.pilha) - 1, 0, -1):
            if self.pilha[i].tag == tag:
                del self.pilha[i:]
                break

    def handle_data(self, data):
        self.pilha[-1].filhos.append(data)


def achar(no: No, pred) -> No | None:
    for f in no.filhos:
        if isinstance(f, No):
            if pred(f):
                return f
            r = achar(f, pred)
            if r:
                return r
    return None


def texto(no) -> str:
    if isinstance(no, str):
        return no
    if no.tag in ("svg", "script", "style", "button") and no.tag != "button":
        return ""
    return "".join(texto(f) for f in no.filhos)


def limpo(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


ANCORAS = {"#onboarding": "/trilha/onboarding", "#coins": "/trilha/trilha-coins", "#como": "/trilha/como-trabalhamos",
           "#automacoes": "/trilha/o-que-acontece-por-tras", "#trilha": "/trilha/a-trilha", "#carteira": "/clientes"}


def inline(no) -> str:
    if isinstance(no, str):
        return re.sub(r"\s+", " ", no)
    if no.tag in ("svg", "script", "style"):
        return ""
    dentro = "".join(inline(f) for f in no.filhos)
    if no.tag in ("b", "strong"):
        t = dentro.strip()
        return f"**{t}**" if t else ""
    if no.tag in ("em", "i"):
        t = dentro.strip()
        return f"*{t}*" if t else ""
    if no.tag == "code":
        return f"`{limpo(texto(no))}`"
    if no.tag == "br":
        return " "
    if no.tag == "a":
        href = no.attrs.get("href", "")
        href = ANCORAS.get(href, href)
        t = limpo(dentro)
        if href.startswith(("http://", "https://", "/")) and t:
            return f"[{t}]({href})"
        return t
    if no.tag == "span" and ({"chip", "pill"} & no.classes):
        t = limpo(dentro)
        return f" *({t})* " if t else ""
    return dentro


def celula(no: No) -> str:
    return limpo(inline(no)).replace("|", "\\|")


def tabela(no: No) -> list[str]:
    linhas = [f for f in iter_tag(no, "tr")]
    if not linhas:
        return []
    out = []
    cab = [celula(c) for c in linhas[0].filhos if isinstance(c, No) and c.tag in ("th", "td")]
    n = len(cab)
    out.append("| " + " | ".join(cab) + " |")
    out.append("|" + "---|" * n)
    for tr in linhas[1:]:
        cels = [c for c in tr.filhos if isinstance(c, No) and c.tag in ("th", "td")]
        if len(cels) == 1 and cels[0].attrs.get("colspan"):
            out.append("| **" + celula(cels[0]) + "** |" + " |" * (n - 1))
            continue
        vals = [celula(c) for c in cels] + [""] * (n - len(cels))
        out.append("| " + " | ".join(vals[:n]) + " |")
    return out


def iter_tag(no: No, tag: str):
    for f in no.filhos:
        if isinstance(f, No):
            if f.tag == tag:
                yield f
            elif f.tag != "table":
                yield from iter_tag(f, tag)


def rotulo_e_titulo(card: No) -> tuple[str, str, str, list]:
    """Separa a etiqueta da frente (pill), o selo de status (chip), o h3 e o resto do cartão."""
    pill, chip, tit, resto = [], [], "", []
    for f in card.filhos:
        if isinstance(f, No) and f.tag == "span" and "pill" in f.classes:
            pill.append(limpo(texto(f)))
        elif isinstance(f, No) and f.tag == "span" and "chip" in f.classes:
            chip.append(limpo(texto(f)))
        elif isinstance(f, No) and f.tag == "p" and achar(f, lambda x: "chip" in x.classes) and not limpo(texto(f)).replace(limpo(texto(achar(f, lambda x: "chip" in x.classes))), ""):
            chip.append(limpo(texto(f)))
        elif isinstance(f, No) and f.tag == "h3" and not tit:
            tit = limpo(inline(f))
        else:
            resto.append(f)
    junta = lambda xs: " · ".join(x for x in xs if x)
    return junta(pill), junta(chip), tit, resto


def blocos(nos, nivel_h3="###") -> list[str]:
    out: list[str] = []
    pendente_inline: list[str] = []

    def descarrega():
        t = limpo("".join(pendente_inline))
        if t:
            out.append(t)
        pendente_inline.clear()

    for no in nos:
        if isinstance(no, str):
            pendente_inline.append(no)
            continue
        if no.tag in ("svg", "script", "style", "input"):
            continue
        cls = no.classes
        if no.tag in ("b", "strong", "em", "i", "code", "span") and not ({"pill", "chip"} & cls and no.tag == "span"):
            pendente_inline.append(inline(no))
            continue
        if no.tag == "a" and not ({"card", "ref", "port", "btn"} & cls):
            pendente_inline.append(inline(no))
            continue
        descarrega()
        if no.tag == "h2":
            out.append("## " + limpo(inline(no)))
        elif no.tag == "h3":
            out.append(f"{nivel_h3} " + limpo(inline(no)))
        elif no.tag == "p":
            if "selos-t" in cls:
                out.append(f"{nivel_h3} " + limpo(inline(no)))
            elif "eyebrow" in cls:
                out.append("**" + limpo(texto(no)) + "**")
            else:
                t = limpo(inline(no))
                if t:
                    out.append(t)
        elif no.tag in ("ul", "ol"):
            itens = [f for f in no.filhos if isinstance(f, No) and f.tag == "li"]
            out.append("\n".join((f"{i}. " if no.tag == "ol" else "- ") + limpo(inline(li)) for i, li in enumerate(itens, 1)))
        elif no.tag == "table":
            out.append("\n".join(tabela(no)))
        elif "valores" in cls or "selo" in cls or ("selos" in cls):
            itens = []
            for f in no.filhos:
                if isinstance(f, No) and f.tag == "div":
                    b, s = achar(f, lambda x: x.tag == "b"), achar(f, lambda x: x.tag == "span")
                    itens.append(f"- **{limpo(texto(b)) if b else ''}** — {limpo(texto(s)) if s else ''}")
                elif isinstance(f, No) and f.tag == "p":
                    out.append(f"{nivel_h3} " + limpo(texto(f)))
            if itens:
                out.append("\n".join(itens))
        elif "solucoes" in cls:
            itens = []
            for f in no.filhos:
                if isinstance(f, No):
                    t = limpo(texto(f)).replace("▾", "").replace("↗", "").strip()
                    href = f.attrs.get("href", "")
                    itens.append(f"- [{t}]({href})" if href.startswith("http") else f"- {t}")
            out.append("\n".join(itens))
        elif "portfolio" in cls:
            for f in no.filhos:
                if isinstance(f, No) and f.tag == "p":
                    out.append(limpo(inline(f)))
            itens = []
            for p in iter_class(no, "port"):
                b, s = achar(p, lambda x: x.tag == "b"), achar(p, lambda x: x.tag == "span")
                nome, de = limpo(texto(b)) if b else "", limpo(texto(s)) if s else ""
                href = p.attrs.get("href", "")
                itens.append(f"- [{nome}]({href}) — {de}" if href.startswith("http") else f"- {nome} — {de} *(link a confirmar)*")
            out.append("**Landing pages e sites que a Trilha já fez:**\n" + "\n".join(itens))
        elif "org" in cls:
            out.append(organograma(no))
        elif "timeline" in cls:
            itens = []
            for tl in iter_class(no, "tl"):
                hr = achar(tl, lambda x: "hr" in x.classes)
                h3 = achar(tl, lambda x: x.tag == "h3")
                p = achar(tl, lambda x: x.tag == "p")
                itens.append(f"- **{limpo(texto(hr)) if hr else ''} · {limpo(texto(h3)) if h3 else ''}** — {limpo(inline(p)) if p else ''}")
            out.append("\n".join(itens))
        elif "refs" in cls:
            itens = []
            for a in [f for f in no.filhos if isinstance(f, No) and f.tag == "a"]:
                pill = achar(a, lambda x: "pill" in x.classes)
                b = achar(a, lambda x: x.tag == "b")
                desc = [limpo(texto(s)) for s in a.filhos if isinstance(s, No) and s.tag == "span" and "pill" not in s.classes]
                itens.append(f"- [**{limpo(texto(b)) if b else ''}**]({a.attrs.get('href','')}) — {' '.join(d for d in desc if d)}" + (f" *({limpo(texto(pill))})*" if pill else ""))
            out.append("\n".join(itens))
        elif no.tag == "a" and "btn" in cls:
            out.append(inline(no) + "")
        elif no.tag == "a" and "card" in cls:
            pill, chip, tit, resto = rotulo_e_titulo(no)
            href = ANCORAS.get(no.attrs.get("href", ""), no.attrs.get("href", ""))
            out.append(f"{nivel_h3} " + (f"{pill} · " if pill else "") + f"[{tit}]({href})")
            out.extend(b.replace(" Abrir →", "") for b in blocos(resto, nivel_h3))
        elif "card" in cls and "tbl" not in cls:
            pill, chip, tit, resto = rotulo_e_titulo(no)
            if "citacao" in cls:
                ps = [f for f in resto if isinstance(f, No) and f.tag == "p"]
                if ps:
                    out.append("> " + limpo(inline(ps[0])))
                    out.extend(blocos(ps[1:], nivel_h3))
                continue
            if tit:
                out.append(f"{nivel_h3} " + (f"{pill} · " if pill else "") + tit + (f" · *{chip}*" if chip else ""))
            elif pill or chip:
                out.append("**" + " · ".join(x for x in (pill, chip) if x) + "**")
            out.extend(blocos(resto, nivel_h3))
        elif no.tag == "details":
            summary = achar(no, lambda x: x.tag == "summary")
            if summary:
                h = achar(summary, lambda x: x.tag == "h3")
                out.append("## " + limpo(texto(h or summary)))
            out.extend(blocos([f for f in no.filhos if not (isinstance(f, No) and f.tag == "summary")], nivel_h3))
        elif "anima" in cls:
            # grades de cartões sob um subtítulo (h3.sub): um nível abaixo
            out.extend(blocos(no.filhos, "####"))
        else:
            out.extend(blocos(no.filhos, nivel_h3))
    descarrega()
    return [b for b in out if b.strip()]


def iter_class(no: No, classe: str):
    for f in no.filhos:
        if isinstance(f, No):
            if classe in f.classes:
                yield f
            else:
                yield from iter_class(f, classe)


def organograma(org: No) -> str:
    linhas = []
    for f in org.filhos:
        if not isinstance(f, No):
            continue
        if "on" in f.classes:
            linhas.append(item_org(f, 0))
        elif "osq" in f.classes:
            for col in [c for c in f.filhos if isinstance(c, No) and "ocol" in c.classes]:
                for g in [c for c in col.filhos if isinstance(c, No)]:
                    if "on" in g.classes:
                        linhas.append(item_org(g, 1))
                    elif "oass" in g.classes:
                        nomes = [limpo(texto(s)) for s in iter_tag(g, "span")]
                        papel = limpo(texto(g).split(nomes[0])[0]) if nomes else "Assessores"
                        linhas.append(f"    - **{papel or 'Assessores'}:** {', '.join(nomes)}")
        elif "oapoio" in f.classes:
            p = achar(f, lambda x: x.tag == "p")
            itens = [limpo(texto(s)) for s in iter_tag(f, "span")]
            linhas.append(f"- **{limpo(texto(p)) if p else 'Apoio'}:** {'; '.join(itens)}")
    return "\n".join(l for l in linhas if l)


def item_org(no: No, nivel: int) -> str:
    span = achar(no, lambda x: x.tag == "span")
    b = achar(no, lambda x: x.tag == "b")
    nome = limpo(texto(span)) if span else ""
    papel = limpo(texto(b)) if b else limpo(texto(no).replace(nome, "", 1))
    if papel == "Clientes do squad":
        return ""
    return ("  " * nivel) + f"- **{papel}**" + (f" — {nome}" if nome else "")


PAGINAS = [
    # slug, data-page, ordem, etapa, título, resumo
    ("comece-aqui", "squads", 0, None, "Comece por aqui", None),
    ("a-trilha", "trilha", 1, "Etapa 1", "A Trilha", "Quem somos, o que vendemos e o que esperamos de um assessor de excelência."),
    ("como-trabalhamos", "como", 2, "Etapa 2", "Como trabalhamos", "A semana, o check-in, o ClickUp e como falar com o cliente."),
    ("onboarding", "onboarding", 3, "Etapa 2 · Como trabalhamos", "Onboarding de cliente novo", "Do kick-off às campanhas no ar em 10 dias úteis, de D0 a D10."),
    ("o-que-acontece-por-tras", "automacoes", 4, "Etapa 3", "O que acontece por trás", "Os avisos automáticos do dia e o que fazer com cada um."),
    ("trilha-coins", "coins", 5, "Etapa 4", "Trilha Coins", "Como a sua pontuação funciona e o que faz perder pontos."),
    ("carteira-e-exigencia", "carteira", 6, "Carteira", "Sua carteira e a nota de exigência", "Como a nota de cada cliente é calculada e o limite de cada nível."),
]

COMPLEMENTO_COINS = """## Onde acompanhar

A sua pontuação, o histórico mês a mês, a data provável da próxima promoção e o ranking do mês ficam em [Trilha Coins](/coins), no menu do Hub.

## Tabela de pontos (regulamento do Trilha Coins)

| Meta | Como pontua | Máximo |
|---|---|---|
| 3.1 Nota de relacionamento | Excelente 300 · Boa 150 · Insatisfatória 0 (atribuída pela coordenação) | 300 |
| 3.2 Taxa de churn | 0 churn 200 · 1 churn 50 · 2 ou mais 0 (só churn atribuído ao assessor, pelo Post Mortem) | 200 |
| 3.3 Adesão a feedback | Muito 200 · Razoável 100 · Pouco 50 · Nenhum 0 | 200 |
| 3.4 Entregas no prazo | ≥90% 200 · 80–89% 100 · 70–79% 50 · <70% 0 (base ClickUp) | 200 |
| 3.5 Reuniões com clientes | ≥90% 200 · 70–89% 100 · 50–69% 50 · <50% 0 (precisa de ata em 🗣️ Reuniões) | 200 |
| 3.6 Presença e cultura | Excelente 200 · Bom 100 · Regular 50 · Insatisfatório 0 | 200 |
| 3.7 Upsell de serviços (bônus) | Acima de R$ 2.000/mês 300 · R$ 1.000–2.000 200 · R$ 500–1.000 100 · até R$ 500 50 | sem teto |
| 3.8 Indicação de novos clientes (bônus) | 300 por cliente indicado e fechado | sem teto |
| 3.9 Certificações (bônus) | Definido pela coordenação (Google Ads, Google Analytics, Meta) | sem teto |

As metas recorrentes (3.1 a 3.6) somam até 1.300 coins por mês; os bônus entram por cima. Promoções só acontecem nos checkpoints de março, junho, setembro e dezembro.
"""


def gerar_conteudos(html_texto: str) -> str:
    arv = Arvore()
    arv.feed(html_texto)
    blocos_sql = []
    for slug, pagina, ordem, etapa, titulo, resumo in PAGINAS:
        sec = achar(arv.raiz, lambda n: n.tag == "section" and n.attrs.get("data-page") == pagina)
        if not sec:
            print("Aviso: página não encontrada:", pagina, file=sys.stderr)
            continue
        filhos = []
        for f in sec.filhos:
            if isinstance(f, No) and f.tag == "header" and "hero" in f.classes:
                lede = achar(f, lambda x: "lede" in x.classes)
                if lede:
                    filhos.append(lede)
                filhos.extend(x for x in f.filhos if isinstance(x, No) and x.tag == "a")
            elif isinstance(f, No) and f.attrs.get("id") == "carteira":
                continue
            else:
                filhos.append(f)
        if pagina == "squads":
            geral = achar(sec, lambda n: "inicio-geral" in n.classes)
            filhos = [f for f in (geral.filhos if geral else []) if not (isinstance(f, No) and ("portas" in f.classes or f.attrs.get("id") == "stepcards"))]
            # "Escolha o seu squad" deixa de existir: no Hub, a carteira já é a de quem entrou.
            filhos = [f for f in filhos if not (isinstance(f, No) and f.tag == "h2" and "squad" in texto(f).lower())]
        partes = blocos(filhos)
        # o "lede" do topo às vezes se repete no primeiro parágrafo ou no resumo da página
        if len(partes) > 1 and partes[1].startswith(partes[0]):
            partes = partes[1:]
        if resumo and partes and partes[0].strip() == resumo:
            partes = partes[1:]
        md = "\n\n".join(partes).strip()
        md = md.replace("**Leitura obrigatória · comece por aqui**", "**Leitura obrigatória · comece por aqui**")
        if slug == "trilha-coins":
            md = re.sub(r"### O que dá pontos e onde acompanhar.*", "", md, flags=re.S).strip() + "\n\n" + COMPLEMENTO_COINS
        blocos_sql.append(
            "insert into conteudos (slug, secao, ordem, etapa, titulo, resumo, corpo_md, publicado)\n"
            f"values ({sql_texto(slug)}, 'trilha', {ordem}, {sql_texto(etapa)}, {sql_texto(titulo)}, {sql_texto(resumo)},\n"
            f"{sql_md(md.strip())},\ntrue)\non conflict (slug) do nothing;\n"
        )
        (DESTINO / "previa").mkdir(parents=True, exist_ok=True)
        (DESTINO / "previa" / f"{slug}.md").write_text(md.strip() + "\n", encoding="utf-8")
    return f"-- Trilha Hub · Trilha do Assessor: processos e cultura ({HOJE})\n-- Rode depois da migration 0007. Rodar de novo não sobrescreve edições feitas no Hub.\n\n{TRAVA}\n" + "\n".join(blocos_sql)


def main() -> None:
    indice = json.loads((ORIGEM / "clientes" / "index.json").read_text(encoding="utf-8"))
    DESTINO.mkdir(parents=True, exist_ok=True)
    # apaga só o que este script gera; arquivos manuais (ex.: 14_*) ficam
    for padrao in ("10_*.sql", "11_*.sql", "12_*.sql", "13_*.sql", "20_*.sql"):
        for antigo in DESTINO.glob(padrao):
            antigo.unlink()

    (DESTINO / "10_clientes.sql").write_text(gerar_clientes(indice), encoding="utf-8")
    (DESTINO / "12_corrige_acentos_clientes.sql").write_text(gerar_correcao_acentos(indice), encoding="utf-8")
    (DESTINO / "13_vincular_assessores.sql").write_text(gerar_vinculo(indice), encoding="utf-8")
    partes = gerar_dossies(indice, ORIGEM / "clientes")
    for i, sql in enumerate(partes, 1):
        (DESTINO / f"11_dossies_parte{i}.sql").write_text(sql, encoding="utf-8")
    (DESTINO / "20_trilha_conteudos.sql").write_text(
        gerar_conteudos((ORIGEM / "index.html").read_text(encoding="utf-8")), encoding="utf-8"
    )

    for f in sorted(DESTINO.glob("*.sql")):
        print(f"{f.name:32s} {f.stat().st_size / 1024:7.1f} KB")


if __name__ == "__main__":
    main()
