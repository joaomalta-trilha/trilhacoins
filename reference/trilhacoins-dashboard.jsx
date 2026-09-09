import React, { useState, useEffect, useMemo } from "react";

/* ---------------------------------------------------------------
   TrilhaCoins — protótipo de gestão
   Regras conforme o documento normativo do programa (v. 2026)
   --------------------------------------------------------------- */

const C = {
  bege: "#E9E8E4",
  begeFrio: "#E2E9E5",
  laranja: "#EE4C20",
  grafite: "#454C47",
  preto: "#212121",
  verdeProfundo: "#39473A",
  salvia: "#717C72",
  nevoa: "#9EAFAA",
  gelo: "#C1CFCA",
  branco: "#FBFAF8",
};

const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "'Noto Serif', Georgia, serif";

const NIVEIS = [
  "Júnior I", "Júnior II", "Júnior III",
  "Pleno I", "Pleno II", "Pleno III",
  "Sênior I", "Sênior II", "Sênior III",
  "Partner",
];

// custo da transição a partir do nível atual
const CUSTO_PROMOCAO = {
  "Júnior I": 2700,
  "Júnior II": 4000,
  "Júnior III": 6800,
  "Pleno I": 8100,
  "Pleno II": 8100,
  "Pleno III": 8100,
  "Sênior I": 12200,
  "Sênior II": 12200,
  "Sênior III": 16200,
  "Partner": null,
};


// transições de macro-nível: exigem pré-requisito qualitativo além do saldo
const MACRO = {
  "Júnior III": "Avaliação de autonomia nas contas",
  "Pleno III": "Gestão autônoma de conta complexa",
  "Sênior III": "Validação da diretoria (receita e retenção)",
};

const BASE_MENSAL = 1300;
const VERDE_OK = "#8FB08A";

const METAS = [
  {
    id: "relacionamento", cod: "3.1", nome: "Nota de relacionamento", max: 300, tipo: "escala",
    opcoes: [
      { rotulo: "Excelente", coins: 300 },
      { rotulo: "Boa", coins: 150 },
      { rotulo: "Insatisfatória", coins: 0 },
    ],
  },
  {
    id: "churn", cod: "3.2", nome: "Taxa de churn", max: 200, tipo: "escala",
    opcoes: [
      { rotulo: "0 churns", coins: 200 },
      { rotulo: "1 churn", coins: 50 },
      { rotulo: "2+ churns", coins: 0 },
    ],
  },
  {
    id: "feedback", cod: "3.3", nome: "Adesão a feedback", max: 200, tipo: "escala",
    opcoes: [
      { rotulo: "Muito", coins: 200 },
      { rotulo: "Razoável", coins: 100 },
      { rotulo: "Pouco", coins: 50 },
      { rotulo: "Nenhum", coins: 0 },
    ],
  },
  {
    id: "entregas", cod: "3.4", nome: "Entregas no prazo", max: 200, tipo: "percentual",
    faixas: [
      { min: 90, coins: 200, rotulo: "≥ 90%" },
      { min: 80, coins: 100, rotulo: "80–89%" },
      { min: 70, coins: 50, rotulo: "70–79%" },
      { min: 0, coins: 0, rotulo: "< 70%" },
    ],
  },
  {
    id: "reunioes", cod: "3.5", nome: "Reuniões com clientes", max: 200, tipo: "percentual",
    faixas: [
      { min: 90, coins: 200, rotulo: "≥ 90%" },
      { min: 70, coins: 100, rotulo: "70–89%" },
      { min: 50, coins: 50, rotulo: "50–69%" },
      { min: 0, coins: 0, rotulo: "< 50%" },
    ],
  },
  {
    id: "cultura", cod: "3.6", nome: "Presença e cultura", max: 200, tipo: "escala",
    opcoes: [
      { rotulo: "Excelente", coins: 200 },
      { rotulo: "Bom", coins: 100 },
      { rotulo: "Regular", coins: 50 },
      { rotulo: "Insatisfatório", coins: 0 },
    ],
  },
];

const BONUS = [
  {
    id: "upsell", cod: "3.7", nome: "Upsell de serviços", tipo: "escala",
    opcoes: [
      { rotulo: "Nenhum", coins: 0 },
      { rotulo: "Até R$ 500", coins: 50 },
      { rotulo: "R$ 500 a 1.000", coins: 100 },
      { rotulo: "R$ 1.000 a 2.000", coins: 200 },
      { rotulo: "Acima de R$ 2.000", coins: 300 },
    ],
  },
  { id: "indicacao", cod: "3.8", nome: "Indicações fechadas", tipo: "contagem", porUnidade: 300 },
  { id: "certificacao", cod: "3.9", nome: "Certificações", tipo: "livre" },
];

const ASSESSORES_INICIAIS = [
  { id: "a1", nome: "Assessor 1", nivel: "Sênior II", saldoInicial: 0 },
  { id: "a2", nome: "Assessor 2", nivel: "Sênior I", saldoInicial: 0 },
  { id: "a3", nome: "Assessor 3", nivel: "Pleno I", saldoInicial: 0 },
  { id: "a4", nome: "Assessor 4", nivel: "Sênior I", saldoInicial: 0 },
  { id: "a5", nome: "Assessor 5", nivel: "Júnior I", saldoInicial: 0 },
  { id: "a6", nome: "Assessor 6", nivel: "Pleno I", saldoInicial: 0 },
  { id: "a7", nome: "Assessor 7", nivel: "Sênior I", saldoInicial: 0 },
];

const MESES_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STORAGE_KEY = "trilhacoins:estado:v1";

/* ---------------- helpers ---------------- */

const fmt = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n || 0));

function rotuloMes(chave) {
  const [a, m] = chave.split("-");
  return `${MESES_PT[Number(m) - 1]}/${a.slice(2)}`;
}

function mesAtualChave() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// o fechamento acontece na primeira semana do mês seguinte,
// então o mês de referência padrão é sempre o anterior
function mesReferenciaPadrao() {
  return somarMeses(mesAtualChave(), -1);
}

function mesesRecentes(qtd = 12) {
  const d = new Date();
  const lista = [];
  for (let i = 0; i < qtd; i++) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    lista.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`);
  }
  return lista;
}

function somarMeses(chave, n) {
  const [a, m] = chave.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function mesesEntre(de, ate) {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

function checkpointApos(chave) {
  let c = chave;
  for (let i = 0; i < 60; i++) {
    if (ehCheckpoint(c)) return c;
    c = somarMeses(c, 1);
  }
  return null;
}

function ehCheckpoint(chave) {
  const m = Number(chave.split("-")[1]);
  return [3, 6, 9, 12].includes(m);
}

function proximoCheckpoint(chave) {
  const [a, m] = chave.split("-").map(Number);
  const alvos = [3, 6, 9, 12];
  const prox = alvos.find((x) => x >= m);
  return prox ? `${a}-${String(prox).padStart(2, "0")}` : `${a + 1}-03`;
}

function coinsDaMeta(meta, valor) {
  if (valor === undefined || valor === null || valor === "") return 0;
  if (meta.tipo === "escala") {
    const op = meta.opcoes.find((o) => o.rotulo === valor);
    return op ? op.coins : 0;
  }
  if (meta.tipo === "percentual") {
    const p = Number(valor);
    if (Number.isNaN(p)) return 0;
    const faixa = meta.faixas.find((f) => p >= f.min);
    return faixa ? faixa.coins : 0;
  }
  if (meta.tipo === "contagem") return Number(valor || 0) * meta.porUnidade;
  if (meta.tipo === "livre") return Number(valor || 0);
  return 0;
}

function totalRecorrente(lanc) {
  return METAS.reduce((s, m) => s + coinsDaMeta(m, lanc?.[m.id]), 0);
}
function totalBonus(lanc) {
  return BONUS.reduce((s, m) => s + coinsDaMeta(m, lanc?.[m.id]), 0);
}
function totalMes(lanc) {
  return totalRecorrente(lanc) + totalBonus(lanc);
}

function nivelSeguinte(nivel) {
  const i = NIVEIS.indexOf(nivel);
  return i >= 0 && i < NIVEIS.length - 1 ? NIVEIS[i + 1] : null;
}

/* ---------------- UI primitivas ---------------- */

function Barra({ pct, cor = C.laranja, altura = 8, fundo = C.gelo }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  return (
    <div style={{ background: fundo, height: altura, borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${p}%`, height: "100%", background: cor, transition: "width .3s ease" }} />
    </div>
  );
}

function Rotulo({ children, cor = C.salvia }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: cor, fontWeight: 500 }}>
      {children}
    </div>
  );
}

function Simbolo({ size = 22, cor = C.laranja }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <g fill={cor}>
        <rect x="45" y="4" width="10" height="92" />
        <rect x="4" y="45" width="92" height="10" />
        <rect x="45" y="10" width="10" height="80" transform="rotate(45 50 50)" />
        <rect x="45" y="10" width="10" height="80" transform="rotate(-45 50 50)" />
      </g>
    </svg>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: C.branco,
        border: `1px solid ${C.gelo}`,
        borderRadius: 6,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- app ---------------- */

export default function TrilhaCoins() {
  const [assessores, setAssessores] = useState(ASSESSORES_INICIAIS);
  const [dados, setDados] = useState({}); // { "2026-09": { assessorId: {meta: valor} } }
  const [promocoes, setPromocoes] = useState([]); // { assessorId, mes, de, para, custo }
  const [fechamentos, setFechamentos] = useState({}); // { "2026-08": true }
  const [mes, setMes] = useState(mesReferenciaPadrao());
  const [aba, setAba] = useState("equipe");
  const [perfil, setPerfil] = useState("diretoria");
  const [selecionado, setSelecionado] = useState("a1");
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState("");

  const meses = useMemo(() => mesesRecentes(14), []);
  const ehAssessor = perfil !== "diretoria" && perfil !== "coordenacao";
  const ehDiretoria = perfil === "diretoria";
  const mesesFechados = meses.filter((m) => fechamentos[m]);
  const mesEfetivo = ehAssessor ? (fechamentos[mes] ? mes : mesesFechados[0] || null) : mes;
  const dadosVisiveis = useMemo(
    () => (ehAssessor ? Object.fromEntries(Object.entries(dados).filter(([k]) => fechamentos[k])) : dados),
    [dados, fechamentos, ehAssessor]
  );
  const mesEditavel = ehDiretoria || !fechamentos[mes];

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          const s = JSON.parse(r.value);
          if (s.assessores) setAssessores(s.assessores);
          if (s.dados) setDados(s.dados);
          if (s.promocoes) setPromocoes(s.promocoes);
          if (s.fechamentos) setFechamentos(s.fechamentos);
        }
      } catch (e) {
        /* primeira execução: nada salvo ainda */
      }
      setCarregando(false);
    })();
  }, []);

  useEffect(() => {
    if (carregando) return;
    (async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ assessores, dados, promocoes, fechamentos }));
      } catch (e) {
        setAviso("Não foi possível salvar. Suas edições valem só nesta sessão.");
      }
    })();
  }, [assessores, dados, promocoes, fechamentos, carregando]);

  /* ---- cálculos ---- */

  const calc = useMemo(() => {
    const mapa = {};
    for (const a of assessores) {
      const lancs = Object.entries(dadosVisiveis)
        .map(([k, v]) => ({ mes: k, lanc: v?.[a.id] }))
        .filter((x) => x.lanc)
        .sort((x, y) => (x.mes < y.mes ? -1 : 1));

      const ganho = lancs.reduce((s, x) => s + totalMes(x.lanc), 0);
      const gasto = promocoes.filter((p) => p.assessorId === a.id).reduce((s, p) => s + p.custo, 0);
      const saldo = (a.saldoInicial || 0) + ganho - gasto;

      const custo = CUSTO_PROMOCAO[a.nivel];
      const faltaCoins = custo ? Math.max(0, custo - saldo) : 0;
      const pctNivel = custo ? Math.min(100, (saldo / custo) * 100) : 100;

      const hoje = mesAtualChave();
      const lancHoje = lancs.find((x) => x.mes === hoje);
      const potencialHoje = Math.max(0, BASE_MENSAL - totalRecorrente(lancHoje?.lanc));
      const cpVigente = proximoCheckpoint(hoje);
      const projetadoCp = saldo + potencialHoje + BASE_MENSAL * mesesEntre(hoje, cpVigente);

      let mesesMax = null, cpMax = null;
      if (custo && faltaCoins > 0) {
        const restante = faltaCoins - potencialHoje;
        const mesAlvo = restante <= 0 ? hoje : somarMeses(hoje, Math.ceil(restante / BASE_MENSAL));
        mesesMax = mesesEntre(hoje, mesAlvo) + 1;
        cpMax = checkpointApos(mesAlvo);
      }

      const ultimos = lancs.slice(-3);
      const media = ultimos.length ? ultimos.reduce((s, x) => s + totalMes(x.lanc), 0) / ultimos.length : 0;

      const proximo = nivelSeguinte(a.nivel);

      const lancMes = dadosVisiveis[mesEfetivo]?.[a.id];
      const recorrenteMes = totalRecorrente(lancMes);
      const bonusMes = totalBonus(lancMes);

      mapa[a.id] = {
        lancs, saldo, ganho, gasto, custo, faltaCoins, pctNivel, media,
        potencialHoje, projetadoCp, mesesMax, cpMax, cpVigente,
        proximo,
        recorrenteMes, bonusMes, totalMesAtual: recorrenteMes + bonusMes,
        pctBase: (recorrenteMes / BASE_MENSAL) * 100,
        lancado: !!lancMes,
        aptoPorSaldo: custo ? saldo >= custo : false,
        macro: MACRO[a.nivel] || null,
      };
    }
    return mapa;
  }, [assessores, dadosVisiveis, promocoes, mesEfetivo]);

  /* ---- ações ---- */

  function setValor(assessorId, metaId, valor) {
    setDados((d) => ({
      ...d,
      [mes]: { ...(d[mes] || {}), [assessorId]: { ...((d[mes] || {})[assessorId] || {}), [metaId]: valor } },
    }));
  }

  function alternarFechamento(chave) {
    setFechamentos((f) => {
      const novo = { ...f };
      if (novo[chave]) delete novo[chave];
      else novo[chave] = true;
      return novo;
    });
  }

  function limparLancamento(assessorId) {
    setDados((d) => {
      const doMes = { ...(d[mes] || {}) };
      delete doMes[assessorId];
      return { ...d, [mes]: doMes };
    });
  }

  function atualizarAssessor(id, campo, valor) {
    setAssessores((as) => as.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  }

  function promover(a) {
    const custo = CUSTO_PROMOCAO[a.nivel];
    const proximo = nivelSeguinte(a.nivel);
    if (!custo || !proximo) return;
    setPromocoes((p) => [...p, { assessorId: a.id, mes, de: a.nivel, para: proximo, custo }]);
    atualizarAssessor(a.id, "nivel", proximo);
  }

  function exportarJSON() {
    const blob = new Blob([JSON.stringify({ assessores, dados, promocoes }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "trilhacoins-dados.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function preencherExemplo() {
    const opts = {
      relacionamento: ["Excelente", "Boa", "Boa", "Excelente", "Insatisfatória"],
      churn: ["0 churns", "0 churns", "1 churn"],
      feedback: ["Muito", "Razoável", "Muito", "Pouco"],
      cultura: ["Excelente", "Bom", "Bom", "Regular"],
      upsell: ["Nenhum", "Até R$ 500", "R$ 1.000 a 2.000", "Nenhum"],
    };
    const pick = (arr, i) => arr[i % arr.length];
    const novos = { ...dados };
    meses.slice(0, 4).forEach((mk, mi) => {
      novos[mk] = { ...(novos[mk] || {}) };
      assessores.forEach((a, ai) => {
        const seed = mi * 3 + ai;
        novos[mk][a.id] = {
          relacionamento: pick(opts.relacionamento, seed),
          churn: pick(opts.churn, seed),
          feedback: pick(opts.feedback, seed),
          entregas: String(70 + ((seed * 7) % 30)),
          reunioes: String(55 + ((seed * 11) % 45)),
          cultura: pick(opts.cultura, seed),
          upsell: pick(opts.upsell, seed),
          indicacao: seed % 5 === 0 ? "1" : "0",
          certificacao: "0",
        };
      });
    });
    setDados(novos);
    const hoje = mesAtualChave();
    setFechamentos((f) => {
      const novosFech = { ...f };
      meses.slice(0, 4).forEach((mk) => {
        if (mk !== hoje) novosFech[mk] = true;
      });
      return novosFech;
    });
    setAssessores((as) =>
      as.map((a, i) => ({
        ...a,
        saldoInicial: a.saldoInicial || [9800, 6200, 3100, 5400, 900, 4300, 7100][i % 7],
      }))
    );
  }

  function limpar() {
    setDados({});
    setPromocoes([]);
    setFechamentos({});
    setAssessores(ASSESSORES_INICIAIS);
  }

  const abas = [
    { id: "equipe", nome: "Equipe" },
    { id: "lancar", nome: "Lançar mês" },
    { id: "assessor", nome: "Assessor" },
    ...(ehDiretoria ? [{ id: "ajustes", nome: "Ajustes" }] : []),
  ];

  return (
    <div style={{ background: C.bege, minHeight: "100vh", fontFamily: SANS, color: C.grafite }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "26px 22px 60px" }}>
        {/* cabeçalho */}
        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Simbolo size={30} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.preto, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                TrilhaCoins
              </div>
              <div style={{ fontSize: 13, color: C.salvia }}>Gestão de metas e progressão dos assessores</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 12, color: C.salvia }}>Ver como</label>
            <select
              value={perfil}
              onChange={(e) => setPerfil(e.target.value)}
              style={inputEstilo({ width: 180 })}
            >
              <option value="diretoria">Diretoria (master)</option>
              <option value="coordenacao">Coordenação</option>
              {assessores.map((x) => (
                <option key={x.id} value={x.id}>{x.nome}</option>
              ))}
            </select>
          </div>

        </header>

        {/* abas */}
        {!ehAssessor && (
        <nav style={{ display: "flex", gap: 4, marginTop: 22, borderBottom: `1px solid ${C.gelo}` }}>
          {abas.map((t) => {
            const ativo = aba === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setAba(t.id)}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: "9px 14px",
                  fontSize: 14,
                  fontWeight: ativo ? 600 : 400,
                  color: ativo ? C.preto : C.salvia,
                  borderBottom: `2px solid ${ativo ? C.laranja : "transparent"}`,
                  cursor: "pointer",
                  fontFamily: SANS,
                }}
              >
                {t.nome}
              </button>
            );
          })}
        </nav>
        )}

        {ehAssessor && (
          <div
            style={{
              marginTop: 18, background: C.grafite, color: C.bege, borderRadius: 4,
              padding: "10px 14px", fontSize: 12.5, display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 12, flexWrap: "wrap",
            }}
          >
            <span>
              Visão do assessor — {assessores.find((x) => x.id === perfil)?.nome} enxerga apenas meses já fechados,
              o próprio painel e a posição no ranking. Sem saldo dos colegas e sem lançamento de notas.
            </span>
            <button onClick={() => setPerfil("diretoria")} style={{ ...linkBotao, color: C.bege, textDecorationColor: C.salvia }}>
              Voltar à diretoria
            </button>
          </div>
        )}

        {aviso && (
          <div style={{ marginTop: 14, fontSize: 13, color: C.laranja }}>{aviso}</div>
        )}

        {carregando ? (
          <p style={{ marginTop: 30, color: C.salvia }}>Carregando dados salvos…</p>
        ) : (
          <main style={{ marginTop: 24 }}>
            {ehAssessor ? (
              mesEfetivo ? (
                <>
                  <VisaoIndividual
                    assessores={assessores}
                    selecionado={perfil}
                    setSelecionado={() => {}}
                    calc={calc}
                    dados={dadosVisiveis}
                    mes={mesEfetivo}
                    setMes={setMes}
                    meses={mesesFechados}
                    travado
                  />
                  <RankingMes assessores={assessores} calc={calc} mes={mesEfetivo} eu={perfil} />
                </>
              ) : (
                <Card>
                  <Rotulo>Nenhum mês fechado</Rotulo>
                  <p style={{ fontSize: 13, color: C.salvia, marginTop: 8, maxWidth: 580 }}>
                    Os resultados aparecem aqui depois que a coordenação fecha a apuração, na primeira semana do mês
                    seguinte. É o comportamento esperado — nenhum mês foi fechado ainda.
                  </p>
                  <p style={{ fontSize: 12, color: C.salvia, marginTop: 10 }}>
                    Para testar: volte à diretoria, abra <strong>Lançar mês</strong> e clique em “Fechar mês”.
                  </p>
                  <button onClick={() => setPerfil("diretoria")} style={{ ...botao(C.grafite), marginTop: 12 }}>
                    Voltar à diretoria
                  </button>
                </Card>
              )
            ) : (
            <>
            {aba === "equipe" && (
              <VisaoEquipe
                assessores={assessores}
                calc={calc}
                mes={mes}
                onAbrir={(id) => { setSelecionado(id); setAba("assessor"); }}
                onPromover={promover}
                setMes={setMes}
                meses={meses}
                fechamentos={fechamentos}
              />
            )}
            {aba === "lancar" && (
              <Lancamento
                assessores={assessores}
                dados={dados}
                mes={mes}
                setMes={setMes}
                meses={meses}
                setValor={setValor}
                calc={calc}
                limparLancamento={limparLancamento}
                fechado={!!fechamentos[mes]}
                editavel={mesEditavel}
                ehDiretoria={ehDiretoria}
                alternarFechamento={alternarFechamento}
              />
            )}
            {aba === "assessor" && (
              <VisaoIndividual
                assessores={assessores}
                selecionado={selecionado}
                setSelecionado={setSelecionado}
                calc={calc}
                dados={dados}
                mes={mes}
                setMes={setMes}
                meses={meses}
              />
            )}
            {aba === "ajustes" && ehDiretoria && (
              <Ajustes
                assessores={assessores}
                atualizar={atualizarAssessor}
                exportar={exportarJSON}
                exemplo={preencherExemplo}
                limpar={limpar}
                promocoes={promocoes}
              />
            )}
            </>
            )}
          </main>
        )}
      </div>
    </div>
  );
}

function SeletorMes({ mes, setMes, meses, rotulo = "Mês de referência" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <label style={{ fontSize: 12, color: C.salvia }}>{rotulo}</label>
      <select value={mes} onChange={(e) => setMes(e.target.value)} style={inputEstilo({ width: 130 })}>
        {meses.map((m) => (
          <option key={m} value={m}>
            {rotuloMes(m)}{ehCheckpoint(m) ? " · checkpoint" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function inputEstilo(extra = {}) {
  return {
    fontFamily: SANS,
    fontSize: 13,
    color: C.grafite,
    background: C.branco,
    border: `1px solid ${C.nevoa}`,
    borderRadius: 4,
    padding: "6px 8px",
    ...extra,
  };
}

/* ---------------- visão da coordenação ---------------- */

function VisaoEquipe({ assessores, calc, mes, onAbrir, onPromover, setMes, meses, fechamentos }) {
  const lancados = assessores.filter((a) => calc[a.id].lancado).length;
  const totalMesEquipe = assessores.reduce((s, a) => s + calc[a.id].totalMesAtual, 0);
  const aptos = assessores.filter((a) => calc[a.id].aptoPorSaldo);
  const cpVigente = proximoCheckpoint(mesAtualChave());

  const ranking = [...assessores].sort((x, y) => calc[y.id].pctNivel - calc[x.id].pctNivel);

  return (
    <>
      {/* ---------- visão acumulada ---------- */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <Resumo
          titulo="Prontos por saldo"
          valor={`${aptos.length}/${assessores.length}`}
          nota="saldo já cobre a próxima transição"
          destaque={aptos.length > 0}
        />
        <Resumo titulo="Próximo checkpoint" valor={rotuloMes(cpVigente)} nota="quando as promoções são efetivadas" />
      </section>

      <Card style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: C.grafite, color: C.bege, textAlign: "left" }}>
                <th style={th}>Assessor</th>
                <th style={th}>Nível atual</th>
                <th style={th}>Próximo nível</th>
                <th style={{ ...th, textAlign: "right" }}>Saldo</th>
                <th style={{ ...th, textAlign: "right" }}>Meta</th>
                <th style={{ ...th, width: 190 }}>Progresso</th>
                <th style={th}>Promoção possível</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((a, i) => {
                const c = calc[a.id];
                const zebra = i % 2 === 0 ? C.branco : C.bege;
                return (
                  <tr key={a.id} style={{ background: zebra, borderBottom: `1px solid ${C.gelo}` }}>
                    <td style={td}>
                      <button onClick={() => onAbrir(a.id)} style={linkBotao}>{a.nome}</button>
                    </td>
                    <td style={{ ...td, color: C.salvia }}>{a.nivel}</td>
                    <td style={td}>{c.proximo || "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(c.saldo)}
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.salvia, fontVariantNumeric: "tabular-nums" }}>
                      {c.custo ? fmt(c.custo) : "—"}
                    </td>
                    <td style={td}>
                      {c.custo ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <Barra pct={c.pctNivel} cor={c.aptoPorSaldo ? VERDE_OK : C.laranja} />
                            </div>
                            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, minWidth: 38, textAlign: "right" }}>
                              {c.pctNivel.toFixed(1).replace(".", ",")}%
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: C.salvia, marginTop: 3 }}>
                            {c.faltaCoins > 0 ? `faltam ${fmt(c.faltaCoins)} coins` : "saldo suficiente"}
                          </div>
                        </>
                      ) : (
                        <span style={{ color: C.salvia }}>nível máximo</span>
                      )}
                    </td>
                    <td style={td}>
                      {!c.custo ? (
                        <span style={{ color: C.salvia }}>—</span>
                      ) : c.aptoPorSaldo ? (
                        <>
                          <div style={{ fontWeight: 700, color: c.macro ? C.laranja : C.verdeProfundo }}>
                            {rotuloMes(c.cpVigente)}
                          </div>
                          <div style={{ fontSize: 11, color: C.salvia }}>
                            {c.macro ? "pendência qualitativa" : "saldo suficiente"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: 600 }}>{rotuloMes(c.cpMax)}</div>
                          <div style={{ fontSize: 11, color: C.salvia }}>
                            {c.mesesMax} {c.mesesMax === 1 ? "mês" : "meses"} a 100%
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p style={{ fontSize: 12, color: C.salvia, marginTop: 8, maxWidth: 760 }}>
        A data de promoção assume 100% da base recorrente (1.300 coins/mês), sem bônus, e conta o mês corrente ainda
        aberto. Upsell, indicação e certificação antecipam o checkpoint.
      </p>

      {/* ---------- apuração do mês ---------- */}
      <div
        style={{
          marginTop: 30, borderTop: `1px solid ${C.gelo}`, paddingTop: 18,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 17, color: C.preto, display: "flex", alignItems: "center", gap: 10 }}>
            Apuração de {rotuloMes(mes)}
            <Tag texto={fechamentos?.[mes] ? "Fechado" : "Aberto"} cor={fechamentos?.[mes] ? C.verdeProfundo : C.laranja} />
          </h3>
          <div style={{ fontSize: 12, color: C.salvia, marginTop: 3 }}>
            {lancados}/{assessores.length} assessores lançados · {fmt(totalMesEquipe)} coins gerados de um teto
            recorrente de {fmt(BASE_MENSAL * assessores.length)}
          </div>
        </div>
        <SeletorMes mes={mes} setMes={setMes} meses={meses} />
      </div>

      <Card style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ background: C.grafite, color: C.bege, textAlign: "left" }}>
                <th style={th}>Assessor</th>
                <th style={{ ...th, width: 240 }}>Base do mês (teto 1.300)</th>
                <th style={{ ...th, textAlign: "right" }}>Bônus</th>
                <th style={{ ...th, textAlign: "right" }}>Total do mês</th>
                <th style={th}>Situação no checkpoint</th>
              </tr>
            </thead>
            <tbody>
              {assessores.map((a, i) => {
                const c = calc[a.id];
                const zebra = i % 2 === 0 ? C.branco : C.bege;
                return (
                  <tr key={a.id} style={{ background: zebra, borderBottom: `1px solid ${C.gelo}` }}>
                    <td style={td}>
                      <button onClick={() => onAbrir(a.id)} style={linkBotao}>{a.nome}</button>
                      <div style={{ fontSize: 11, color: C.salvia }}>{a.nivel}</div>
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1 }}><Barra pct={c.pctBase} /></div>
                        <span style={{ fontVariantNumeric: "tabular-nums", minWidth: 78, textAlign: "right" }}>
                          {fmt(c.recorrenteMes)} <span style={{ color: C.salvia }}>· {Math.round(c.pctBase)}%</span>
                        </span>
                      </div>
                      {!c.lancado && <span style={{ fontSize: 11, color: C.laranja }}>sem lançamento</span>}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {c.bonusMes ? `+${fmt(c.bonusMes)}` : "—"}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(c.totalMesAtual)}
                    </td>
                    <td style={td}>
                      <Situacao c={c} a={a} onPromover={onPromover} mes={mes} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function Situacao({ c, a, onPromover, mes }) {
  if (!c.custo) return <Tag texto="Partner" cor={C.grafite} />;
  if (!c.aptoPorSaldo) return <Tag texto="Acumulando" cor={C.salvia} />;

  const pendencias = [];
  if (c.macro) pendencias.push(c.macro);

  if (pendencias.length) {
    return (
      <div>
        <Tag texto="Saldo ok, com pendência" cor={C.laranja} />
        <div style={{ fontSize: 11, color: C.salvia, marginTop: 4 }}>{pendencias.join(" · ")}</div>
      </div>
    );
  }
  return (
    <div>
      <Tag texto="Apto a promover" cor={C.verdeProfundo} />
      {ehCheckpoint(mes) ? (
        <button onClick={() => onPromover(a)} style={{ ...linkBotao, color: C.laranja, marginTop: 4, fontWeight: 600 }}>
          Efetivar promoção
        </button>
      ) : (
        <div style={{ fontSize: 11, color: C.salvia, marginTop: 4 }}>
          efetiva em {rotuloMes(proximoCheckpoint(mesAtualChave()))}
        </div>
      )}
    </div>
  );
}

function Tag({ texto, cor }) {
  return (
    <span style={{ fontSize: 11, color: cor, border: `1px solid ${cor}`, borderRadius: 3, padding: "2px 6px", whiteSpace: "nowrap" }}>
      {texto}
    </span>
  );
}

function Resumo({ titulo, valor, nota, destaque }) {
  return (
    <Card style={{ padding: 16 }}>
      <Rotulo>{titulo}</Rotulo>
      <div style={{ fontSize: 30, fontWeight: 700, color: destaque ? C.laranja : C.preto, marginTop: 6, letterSpacing: "-0.02em" }}>
        {valor}
      </div>
      <div style={{ fontSize: 12, color: C.salvia, marginTop: 2 }}>{nota}</div>
    </Card>
  );
}

/* ---------------- lançamento mensal ---------------- */

function Lancamento({
  assessores, dados, mes, setMes, meses, setValor, calc, limparLancamento,
  fechado, editavel, ehDiretoria, alternarFechamento,
}) {
  const lanc = dados[mes] || {};

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 18, color: C.preto, margin: 0 }}>
            Apuração de {rotuloMes(mes)}
            {ehCheckpoint(mes) && <span style={{ color: C.laranja, fontSize: 13, marginLeft: 8 }}>mês de checkpoint</span>}
          </h2>
          <div style={{ fontSize: 12, color: C.salvia, marginTop: 3 }}>
            {fechado
              ? `Mês fechado — os assessores já enxergam ${rotuloMes(mes)}.`
              : `Aberto · fechamento na primeira semana de ${rotuloMes(somarMeses(mes, 1))}.`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: C.salvia }}>As alterações salvam sozinhas.</span>
          <SeletorMes mes={mes} setMes={setMes} meses={meses} rotulo="Mês" />
        </div>
      </div>

      {fechado && (
        <div
          style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 4, fontSize: 12.5,
            background: editavel ? "#F6E2DA" : C.begeFrio, color: C.grafite,
            border: `1px solid ${editavel ? C.laranja : C.gelo}`,
          }}
        >
          {editavel
            ? "Mês fechado. Você está editando como diretoria — a alteração muda o saldo já divulgado ao assessor."
            : "Mês fechado. Para corrigir um lançamento, peça a reabertura à diretoria."}
        </div>
      )}

      <Card style={{ marginTop: 14, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 12.5, minWidth: 1050 }}>
            <thead>
              <tr style={{ background: C.grafite, color: C.bege, textAlign: "left" }}>
                <th style={{ ...th, position: "sticky", left: 0, background: C.grafite, minWidth: 150 }}>Assessor</th>
                {METAS.map((m) => (
                  <th key={m.id} style={{ ...th, minWidth: 118 }}>
                    <span style={{ opacity: 0.6 }}>{m.cod}</span> {m.nome}
                  </th>
                ))}
                {BONUS.map((m) => (
                  <th key={m.id} style={{ ...th, minWidth: 118, color: "#F0B9A8" }}>
                    <span style={{ opacity: 0.6 }}>{m.cod}</span> {m.nome}
                  </th>
                ))}
                <th style={{ ...th, textAlign: "right", minWidth: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {assessores.map((a, i) => {
                const l = lanc[a.id] || {};
                const zebra = i % 2 === 0 ? C.branco : C.bege;
                return (
                  <tr key={a.id} style={{ background: zebra, borderBottom: `1px solid ${C.gelo}` }}>
                    <td style={{ ...td, position: "sticky", left: 0, background: zebra, fontWeight: 600 }}>
                      {a.nome}
                      <div style={{ fontSize: 11, color: C.salvia, fontWeight: 400 }}>{a.nivel}</div>
                      {editavel && Object.keys(l).length > 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Apagar os lançamentos de ${a.nome} em ${rotuloMes(mes)}?`)) {
                              limparLancamento(a.id);
                            }
                          }}
                          title={`Apagar os lançamentos de ${rotuloMes(mes)}`}
                          style={{
                            marginTop: 6, border: `1px solid ${C.nevoa}`, background: "transparent",
                            color: C.salvia, borderRadius: 3, padding: "2px 7px", fontSize: 11,
                            fontFamily: SANS, fontWeight: 400, cursor: "pointer",
                          }}
                        >
                          Limpar mês
                        </button>
                      )}
                    </td>
                    {[...METAS, ...BONUS].map((m) => (
                      <td key={m.id} style={td}>
                        <CampoMeta meta={m} valor={l[m.id]} onChange={(v) => setValor(a.id, m.id, v)} travado={!editavel} />
                      </td>
                    ))}
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <div style={{ fontWeight: 700, color: C.preto }}>{fmt(totalMes(l))}</div>
                      <div style={{ fontSize: 11, color: C.salvia }}>{Math.round(calc[a.id].pctBase)}% da base</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function CampoMeta({ meta, valor, onChange, travado }) {
  const coins = coinsDaMeta(meta, valor);
  const nota = (
    <div style={{ fontSize: 11, color: coins > 0 ? C.laranja : C.nevoa, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
      {coins > 0 ? `+${fmt(coins)}` : "0"}
    </div>
  );

  if (travado) {
    return (
      <div>
        <div style={{ fontSize: 13, color: C.grafite }}>
          {valor === undefined || valor === "" ? "—" : meta.tipo === "percentual" ? `${valor}%` : valor}
        </div>
        {nota}
      </div>
    );
  }

  if (meta.tipo === "escala") {
    return (
      <div>
        <select value={valor || ""} onChange={(e) => onChange(e.target.value)} style={inputEstilo({ width: "100%" })}>
          <option value="">—</option>
          {meta.opcoes.map((o) => (
            <option key={o.rotulo} value={o.rotulo}>{o.rotulo}</option>
          ))}
        </select>
        {nota}
      </div>
    );
  }
  if (meta.tipo === "percentual") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input
            type="number" min="0" max="100" value={valor ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={inputEstilo({ width: 60 })}
            placeholder="—"
          />
          <span style={{ color: C.salvia }}>%</span>
        </div>
        {nota}
      </div>
    );
  }
  if (meta.tipo === "contagem") {
    return (
      <div>
        <input
          type="number" min="0" value={valor ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputEstilo({ width: 60 })}
          placeholder="0"
        />
        {nota}
      </div>
    );
  }
  return (
    <div>
      <input
        type="number" min="0" step="50" value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputEstilo({ width: 70 })}
        placeholder="coins"
      />
      {nota}
    </div>
  );
}

/* ---------------- visão individual ---------------- */

function VisaoIndividual({ assessores, selecionado, setSelecionado, calc, dados, mes, setMes, meses, travado }) {
  const a = assessores.find((x) => x.id === selecionado) || assessores[0];
  const c = calc[a.id];
  const l = dados[mes]?.[a.id] || {};

  const historico = c.lancs.slice(-12);
  const maxHist = Math.max(BASE_MENSAL, ...historico.map((h) => totalMes(h.lanc)), 1);
  const bonusAcumulado = c.lancs.reduce((s, h) => s + totalBonus(h.lanc), 0);
  const recorrenteAcumulado = c.lancs.reduce((s, h) => s + totalRecorrente(h.lanc), 0);
  const aproveitamento = c.lancs.length ? (recorrenteAcumulado / (BASE_MENSAL * c.lancs.length)) * 100 : 0;
  const melhorMes = c.lancs.reduce((m, h) => (!m || totalMes(h.lanc) > totalMes(m.lanc) ? h : m), null);

  return (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {travado ? (
          <div style={{ fontSize: 20, fontWeight: 700, color: C.preto, letterSpacing: "-0.02em" }}>{a.nome}</div>
        ) : (
          <select value={a.id} onChange={(e) => setSelecionado(e.target.value)} style={inputEstilo({ fontSize: 15, padding: "8px 10px" })}>
            {assessores.map((x) => (
              <option key={x.id} value={x.id}>{x.nome}</option>
            ))}
          </select>
        )}
        <span style={{ color: C.salvia, fontSize: 13 }}>{a.nivel}</span>
      </div>

      {/* ---------- panorama ---------- */}
      <Card style={{ marginTop: 16, background: C.preto, border: "none", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <Rotulo cor={C.nevoa}>Saldo acumulado</Rotulo>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 54, fontWeight: 700, color: C.bege, letterSpacing: "-0.03em", lineHeight: 1 }}>
                {fmt(c.saldo)}
              </span>
              <span style={{ color: C.nevoa, fontSize: 14 }}>coins</span>
            </div>
            <div style={{ fontSize: 13, color: C.nevoa, marginTop: 8 }}>
              {c.custo
                ? c.faltaCoins > 0
                  ? <>Faltam <strong style={{ color: C.laranja }}>{fmt(c.faltaCoins)} coins</strong> para {c.proximo}.</>
                  : <>Saldo suficiente para {c.proximo}. Efetivação no checkpoint de {rotuloMes(proximoCheckpoint(mesAtualChave()))}.</>
                : "Nível máximo da trilha."}
            </div>
          </div>

          {c.custo && <AnelProgresso pct={c.pctNivel} destino={c.proximo} apto={c.aptoPorSaldo} />}
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.nevoa, marginBottom: 6 }}>
            <span>{a.nivel}</span>
            <span>{c.proximo || "—"} {c.custo ? `· ${fmt(c.custo)} coins` : ""}</span>
          </div>
          <Barra pct={c.pctNivel} altura={14} cor={c.aptoPorSaldo ? VERDE_OK : C.laranja} fundo="#333833" />
          {c.mesesMax ? (
            <div style={{ fontSize: 12, color: C.nevoa, marginTop: 8 }}>
              Batendo 100% da base: {c.mesesMax} {c.mesesMax === 1 ? "mês" : "meses"}.
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            marginTop: 24,
            borderTop: "1px solid #333833",
          }}
        >
          <MetricaEscura rotulo="Média mensal" valor={fmt(c.media)} nota="últimos 3 meses" />
          <MetricaEscura rotulo="Aproveitamento" valor={`${Math.round(aproveitamento)}%`} nota="da base recorrente" />
          <MetricaEscura rotulo="Total já ganho" valor={fmt(c.ganho)} nota={`${c.lancs.length} ${c.lancs.length === 1 ? "mês lançado" : "meses lançados"}`} />
          <MetricaEscura rotulo="Bônus acumulado" valor={fmt(bonusAcumulado)} nota="upsell, indicação, certificação" />
          <MetricaEscura rotulo="Gasto em promoções" valor={c.gasto ? `−${fmt(c.gasto)}` : "0"} nota="debitado do saldo" />
          <MetricaEscura
            rotulo="Melhor mês"
            valor={melhorMes ? fmt(totalMes(melhorMes.lanc)) : "—"}
            nota={melhorMes ? rotuloMes(melhorMes.mes) : "sem histórico"}
          />
        </div>
      </Card>

      <PainelCheckpoint a={a} c={c} />

      {/* ---------- histórico ---------- */}
      <Card style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <Rotulo>Histórico mensal de coins</Rotulo>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: C.salvia }}>
            <Legenda cor={C.laranja} texto="Base recorrente" />
            <Legenda cor={C.verdeProfundo} texto="Bônus" />
          </div>
        </div>

        {historico.length === 0 ? (
          <p style={{ fontSize: 13, color: C.salvia, marginTop: 14 }}>
            Nenhum mês lançado ainda. Registre a primeira apuração na aba “Lançar mês”.
          </p>
        ) : (
          <GraficoHistorico historico={historico} mesSelecionado={mes} />
        )}
      </Card>

      {/* ---------- detalhe do mês ---------- */}
      <div
        style={{
          marginTop: 26, borderTop: `1px solid ${C.gelo}`, paddingTop: 18,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 17, color: C.preto }}>
          Detalhamento do mês
          {!c.lancado && <span style={{ color: C.laranja, fontSize: 13, marginLeft: 8 }}>sem lançamento</span>}
        </h3>
        <SeletorMes mes={mes} setMes={setMes} meses={meses} rotulo="Mês" />
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 12 }}>
        <Card>
          <Rotulo>Base recorrente do mês</Rotulo>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: C.preto, letterSpacing: "-0.02em" }}>{fmt(c.recorrenteMes)}</span>
            <span style={{ color: C.salvia, fontSize: 14 }}>/ {fmt(BASE_MENSAL)}</span>
          </div>
          <div style={{ marginTop: 8 }}><Barra pct={c.pctBase} altura={10} /></div>
          <div style={{ fontSize: 12, color: C.salvia, marginTop: 6 }}>
            {c.recorrenteMes >= BASE_MENSAL
              ? "Base mensal completa."
              : `Faltam ${fmt(BASE_MENSAL - c.recorrenteMes)} coins (${Math.round(100 - c.pctBase)}%) para a base cheia.`}
          </div>
          {c.bonusMes > 0 && (
            <div style={{ fontSize: 12, color: C.laranja, marginTop: 4 }}>+{fmt(c.bonusMes)} em bônus, fora do teto.</div>
          )}

          <div style={{ marginTop: 16, borderTop: `1px solid ${C.gelo}`, paddingTop: 14 }}>
            <Rotulo>Requisitos além do saldo</Rotulo>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <Requisito
                rotulo={c.macro ? "Pré-requisito de macro-nível" : "Sem pré-requisito qualitativo"}
                ok={!c.macro}
                detalhe={c.macro || "Transição dentro do mesmo macro-nível."}
                pendenteManual={!!c.macro}
              />
            </div>
          </div>
        </Card>

        <Card>
          <Rotulo>Metas de {rotuloMes(mes)}</Rotulo>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 13 }}>
            <tbody>
              {METAS.map((m) => {
                const g = coinsDaMeta(m, l[m.id]);
                const pct = (g / m.max) * 100;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${C.gelo}` }}>
                    <td style={{ padding: "8px 0" }}>
                      {m.nome}
                      {l[m.id] !== undefined && l[m.id] !== "" && (
                        <span style={{ color: C.salvia, fontSize: 11 }}>
                          {" "}· {m.tipo === "percentual" ? `${l[m.id]}%` : l[m.id]}
                        </span>
                      )}
                    </td>
                    <td style={{ width: 80, padding: "8px 0" }}><Barra pct={pct} altura={6} /></td>
                    <td style={{ textAlign: "right", width: 86, fontVariantNumeric: "tabular-nums", color: g === m.max ? C.verdeProfundo : C.grafite }}>
                      {fmt(g)} / {fmt(m.max)}
                    </td>
                  </tr>
                );
              })}
              {BONUS.map((m) => {
                const g = coinsDaMeta(m, l[m.id]);
                if (!g) return null;
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${C.gelo}` }}>
                    <td style={{ padding: "8px 0", color: C.laranja }}>{m.nome}</td>
                    <td />
                    <td style={{ textAlign: "right", color: C.laranja, fontVariantNumeric: "tabular-nums" }}>+{fmt(g)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>
    </>
  );
}

function RankingMes({ assessores, calc, mes, eu }) {
  const ordenado = [...assessores]
    .map((a) => ({ a, pct: calc[a.id].pctBase, coins: calc[a.id].recorrenteMes }))
    .sort((x, y) => y.pct - x.pct);
  const posicao = ordenado.findIndex((x) => x.a.id === eu) + 1;
  const total = ordenado.length;
  const topo = ordenado.slice(0, 3);
  const naoEstaNoTopo = !topo.some((x) => x.a.id === eu);
  const meu = ordenado.find((x) => x.a.id === eu);

  return (
    <Card style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <Rotulo>Ranking do time em {rotuloMes(mes)}</Rotulo>
        <span style={{ fontSize: 12, color: C.salvia }}>por % da base recorrente — o teto é o mesmo para todos</span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 32, fontWeight: 700, color: C.preto, letterSpacing: "-0.02em" }}>{posicao}º</span>
        <span style={{ fontSize: 14, color: C.salvia }}>de {total} · {Math.round(meu?.pct || 0)}% da base</span>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, fontSize: 13 }}>
        <tbody>
          {topo.map((x, i) => {
            const souEu = x.a.id === eu;
            return (
              <tr key={x.a.id} style={{ borderBottom: `1px solid ${C.gelo}` }}>
                <td style={{ padding: "8px 0", width: 30, color: C.salvia }}>{i + 1}º</td>
                <td style={{ padding: "8px 0", fontWeight: souEu ? 700 : 400 }}>
                  {x.a.nome}{souEu ? " (você)" : ""}
                </td>
                <td style={{ width: 110, padding: "8px 0" }}><Barra pct={x.pct} altura={6} /></td>
                <td style={{ textAlign: "right", width: 50, fontVariantNumeric: "tabular-nums" }}>{Math.round(x.pct)}%</td>
              </tr>
            );
          })}
          {naoEstaNoTopo && meu && (
            <tr>
              <td style={{ padding: "8px 0", color: C.salvia }}>{posicao}º</td>
              <td style={{ padding: "8px 0", fontWeight: 700 }}>{meu.a.nome} (você)</td>
              <td style={{ padding: "8px 0" }}><Barra pct={meu.pct} altura={6} /></td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Math.round(meu.pct)}%</td>
            </tr>
          )}
        </tbody>
      </table>

      <p style={{ fontSize: 12, color: C.salvia, marginTop: 12 }}>
        Só o pódio aparece com nome. Saldo acumulado e progressão de nível de cada um ficam restritos à coordenação.
      </p>
    </Card>
  );
}

function PainelCheckpoint({ a, c }) {
  const hoje = mesAtualChave();
  const cp = c.cpVigente;
  const mesesAteCp = mesesEntre(hoje, cp);
  const projetadoMax = c.projetadoCp;

  const cpTexto = mesesAteCp === 0 ? "é este mês" : `faltam ${mesesAteCp} ${mesesAteCp === 1 ? "mês" : "meses"}`;

  const mesesMax = c.mesesMax;
  const cpMax = c.cpMax;
  const pendencias = [];
  if (c.custo && c.aptoPorSaldo) {
    if (c.macro) pendencias.push(c.macro);
  }

  const prontoAgora = c.custo && c.aptoPorSaldo;
  const dataPromocao = prontoAgora ? cp : cpMax;

  return (
    <Card
      style={{
        marginTop: 12,
        borderLeft: `3px solid ${prontoAgora ? VERDE_OK : C.laranja}`,
        background: C.begeFrio,
      }}
    >
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "stretch" }}>
        <div style={{ flex: "1 1 190px" }}>
          <Rotulo>Próximo checkpoint</Rotulo>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.preto, marginTop: 5, letterSpacing: "-0.02em" }}>
            {rotuloMes(cp)}
          </div>
          <div style={{ fontSize: 12, color: C.salvia, marginTop: 2 }}>{cpTexto}</div>
        </div>

        <div style={{ flex: "1 1 190px" }}>
          <Rotulo>Projeção a 100% no checkpoint</Rotulo>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.grafite, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>
            {fmt(projetadoMax)}
          </div>
          <div style={{ fontSize: 12, color: C.salvia, marginTop: 2 }}>
            {c.custo ? `custo da transição: ${fmt(c.custo)}` : "sem transição adiante"}
          </div>
        </div>

        {c.custo && (
          <div
            style={{
              flex: "1 1 250px",
              background: prontoAgora ? VERDE_OK : C.laranja,
              color: prontoAgora ? C.preto : C.bege,
              borderRadius: 4,
              padding: "14px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.85 }}>
              {prontoAgora ? "Promoção liberada em" : "Promoção possível em"}
            </div>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
              {rotuloMes(dataPromocao)}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {c.proximo}
              {!prontoAgora && mesesMax ? ` · ${mesesMax} ${mesesMax === 1 ? "mês" : "meses"} batendo 100% da base` : ""}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, borderTop: `1px solid ${C.gelo}`, paddingTop: 12, fontSize: 13, color: C.grafite }}>
        {!c.custo ? (
          <span>Nível máximo da trilha — não há transição a projetar.</span>
        ) : prontoAgora ? (
          <span>
            Saldo já cobre a promoção a <strong>{c.proximo}</strong>.{" "}
            {pendencias.length ? `Pendente: ${pendencias.join(" · ")}.` : "Basta a validação no checkpoint."}
          </span>
        ) : (
          <span>
            Faltam <strong>{fmt(c.faltaCoins)}</strong> coins para {c.proximo}. A data considera 1.300 coins/mês, sem
            bônus, contando {rotuloMes(hoje)} — que ainda está aberto. Upsell, indicação e certificação antecipam o
            checkpoint.
          </span>
        )}
      </div>
    </Card>
  );
}

function GraficoHistorico({ historico, mesSelecionado }) {
  const ALTURA = 190;
  const totais = historico.map((h) => totalMes(h.lanc));
  const pico = Math.max(BASE_MENSAL, ...totais);
  const topo = Math.ceil(pico / 250) * 250;
  const linhas = [topo, BASE_MENSAL, BASE_MENSAL / 2, 0].filter((v, i, arr) => arr.indexOf(v) === i);
  const larguraBarra = historico.length > 8 ? 26 : 38;

  return (
    <div style={{ display: "flex", marginTop: 20 }}>
      {/* eixo vertical */}
      <div style={{ width: 44, position: "relative", height: ALTURA, flexShrink: 0 }}>
        {linhas.map((v) => (
          <div
            key={v}
            style={{
              position: "absolute",
              bottom: (v / topo) * ALTURA,
              right: 8,
              transform: "translateY(50%)",
              fontSize: 10,
              color: v === BASE_MENSAL ? C.grafite : C.nevoa,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(v)}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* área do gráfico */}
        <div style={{ position: "relative", height: ALTURA }}>
          {linhas.map((v) => (
            <div
              key={v}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: (v / topo) * ALTURA,
                borderTop:
                  v === BASE_MENSAL
                    ? `1px dashed ${C.salvia}`
                    : v === 0
                    ? `1px solid ${C.nevoa}`
                    : `1px solid ${C.gelo}`,
              }}
            />
          ))}

          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
            {historico.map((h) => {
              const rec = totalRecorrente(h.lanc);
              const bon = totalBonus(h.lanc);
              const destaque = h.mes === mesSelecionado;
              return (
                <div
                  key={h.mes}
                  title={`${rotuloMes(h.mes)} · base ${fmt(rec)}${bon ? ` · bônus ${fmt(bon)}` : ""}`}
                  style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      marginBottom: 5,
                      color: destaque ? C.preto : C.salvia,
                      fontWeight: destaque ? 700 : 400,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(rec + bon)}
                  </div>
                  <div style={{ width: "100%", maxWidth: larguraBarra, display: "flex", flexDirection: "column" }}>
                    {bon > 0 && (
                      <div style={{ height: (bon / topo) * ALTURA, background: C.verdeProfundo, opacity: destaque ? 1 : 0.8 }} />
                    )}
                    <div style={{ height: Math.max(2, (rec / topo) * ALTURA), background: C.laranja, opacity: destaque ? 1 : 0.75 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* eixo horizontal */}
        <div style={{ display: "flex", marginTop: 7 }}>
          {historico.map((h) => {
            const destaque = h.mes === mesSelecionado;
            const cp = ehCheckpoint(h.mes);
            return (
              <div key={h.mes} style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 11,
                    color: destaque ? C.preto : cp ? C.laranja : C.salvia,
                    fontWeight: destaque ? 600 : 400,
                  }}
                >
                  {rotuloMes(h.mes)}
                </div>
                {cp && (
                  <div style={{ fontSize: 9, color: C.laranja, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>
                    checkpoint
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetricaEscura({ rotulo, valor, nota }) {
  return (
    <div style={{ padding: "14px 16px 12px", borderRight: "1px solid #333833" }}>
      <Rotulo cor={C.salvia}>{rotulo}</Rotulo>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.bege, marginTop: 4, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </div>
      <div style={{ fontSize: 11, color: C.salvia, marginTop: 2 }}>{nota}</div>
    </div>
  );
}

function AnelProgresso({ pct, destino, apto }) {
  const p = Math.max(0, Math.min(100, pct || 0));
  const r = 46;
  const circ = 2 * Math.PI * r;
  const cor = apto ? VERDE_OK : C.gelo;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ position: "relative", width: 116, height: 116 }}>
        <svg width="116" height="116" viewBox="0 0 116 116" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="58" cy="58" r={r} fill="none" stroke="#333833" strokeWidth="9" />
          <circle
            cx="58" cy="58" r={r} fill="none" stroke={cor} strokeWidth="9" strokeLinecap="butt"
            strokeDasharray={`${(p / 100) * circ} ${circ}`}
          />
        </svg>
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 30, fontWeight: 700, color: cor, letterSpacing: "-0.02em", lineHeight: 1 }}>
            {Math.round(p)}%
          </span>
          <span style={{ fontSize: 10, color: C.salvia, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 }}>
            do caminho
          </span>
        </div>
      </div>
      <div style={{ maxWidth: 110 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.salvia }}>Rumo a</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.bege, marginTop: 3 }}>{destino}</div>
        {apto && <div style={{ fontSize: 12, color: VERDE_OK, marginTop: 4 }}>Saldo completo</div>}
      </div>
    </div>
  );
}

function Legenda({ cor, texto }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 9, height: 9, background: cor, borderRadius: 1, display: "inline-block" }} />
      {texto}
    </span>
  );
}

function Requisito({ rotulo, ok, detalhe, pendenteManual }) {
  const cor = ok ? C.verdeProfundo : pendenteManual ? C.salvia : C.laranja;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ width: 8, height: 8, borderRadius: 1, background: cor, marginTop: 5, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, color: C.preto }}>{rotulo}</div>
        <div style={{ fontSize: 12, color: C.salvia }}>{detalhe}</div>
      </div>
    </div>
  );
}

/* ---------------- ajustes ---------------- */

function Ajustes({ assessores, atualizar, exportar, exemplo, limpar, promocoes }) {
  return (
    <>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13, minWidth: 620 }}>
            <thead>
              <tr style={{ background: C.grafite, color: C.bege, textAlign: "left" }}>
                <th style={th}>Assessor</th>
                <th style={th}>Nível</th>
                <th style={th}>Saldo inicial de coins</th>
              </tr>
            </thead>
            <tbody>
              {assessores.map((a, i) => (
                <tr key={a.id} style={{ background: i % 2 === 0 ? C.branco : C.bege, borderBottom: `1px solid ${C.gelo}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{a.nome}</td>
                  <td style={td}>
                    <select value={a.nivel} onChange={(e) => atualizar(a.id, "nivel", e.target.value)} style={inputEstilo()}>
                      {NIVEIS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input
                      type="number" value={a.saldoInicial}
                      onChange={(e) => atualizar(a.id, "saldoInicial", Number(e.target.value))}
                      style={inputEstilo({ width: 110 })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button onClick={exemplo} style={botao(C.grafite)}>Preencher com dados de exemplo</button>
        <button onClick={exportar} style={botao(C.laranja)}>Baixar dados em JSON</button>
        <button onClick={limpar} style={{ ...botao(C.salvia), background: "transparent", color: C.salvia }}>Zerar tudo</button>
      </div>

      <Card style={{ marginTop: 18 }}>
        <Rotulo>Promoções efetivadas</Rotulo>
        {promocoes.length === 0 ? (
          <p style={{ fontSize: 13, color: C.salvia, marginTop: 8 }}>Nenhuma promoção registrada neste protótipo.</p>
        ) : (
          <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13 }}>
            {promocoes.map((p, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {rotuloMes(p.mes)} · {p.de} → {p.para} · −{fmt(p.custo)} coins
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

const th = { padding: "10px 12px", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" };
const td = { padding: "10px 12px", verticalAlign: "top" };
const linkBotao = {
  border: "none", background: "transparent", padding: 0, fontFamily: SANS, fontSize: 13,
  color: C.preto, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: C.nevoa,
};
function botao(cor) {
  return {
    background: cor, color: C.bege, border: `1px solid ${cor}`, borderRadius: 4,
    padding: "8px 14px", fontSize: 13, fontFamily: SANS, cursor: "pointer",
  };
}
