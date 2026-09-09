# TrilhaCoins — briefing de desenvolvimento

Sistema interno de gestão do plano de carreira dos Assessores de Marketing da
Trilha Performance Digital. Este documento é a especificação completa: modelo de
dados, regras de cálculo, permissões, telas e casos de borda.

O protótipo React em `trilhacoins-dashboard.jsx` é a referência visual e de
comportamento. Onde este documento e o protótipo divergirem, **este documento
vence** — o protótipo não tem backend, autenticação nem log.

---

## 1. O que importar no Claude Code

Coloque estes quatro arquivos no repositório antes de começar:

| Arquivo | Para quê |
|---|---|
| `BRIEFING-trilhacoins.md` (este) | Especificação. Referencie no prompt inicial. |
| `trilhacoins-dashboard.jsx` | Protótipo funcional — layout, componentes, fórmulas. |
| `Apresentacao_TrilhaCoins.pdf` | Documento normativo do programa, usado com o time. |
| `trilhacoins-dados.json` | Export do protótipo (botão em Ajustes) — serve de seed. |

Adicione também a skill `trilha-brand` para a identidade visual.

Prompt inicial sugerido:

> Leia BRIEFING-trilhacoins.md e trilhacoins-dashboard.jsx. Vamos construir o
> sistema descrito no briefing, começando pelo modelo de dados e pelas regras de
> pontuação. Não escreva telas antes de o cálculo estar coberto por testes.

---

## 2. Contexto

- 7 assessores hoje, projeção de até 20. Volume irrelevante para arquitetura.
- Apuração mensal, fechada na **primeira semana do mês seguinte**.
- Promoções efetivadas apenas em **checkpoints trimestrais**: março, junho,
  setembro e dezembro.
- Todo o time usa Google Workspace no domínio `@somostrilha.com.br`.

O programa não é folha de pagamento nem bônus financeiro: é progressão de
carreira. O saldo de coins é o que destrava a promoção de nível.

---

## 3. Stack

Recomendação: **Next.js (App Router) + Supabase**.

- **Supabase Auth** com provedor Google, restrito ao domínio
  `somostrilha.com.br`. Sem senha, sem fluxo de recuperação.
- **Postgres** com Row Level Security. As regras de acesso vivem no banco, não
  só no código — um bug de rota não pode vazar dado de outro assessor.
- Deploy na Vercel ou no Render.

Alternativa aceitável: Cloudflare Workers + D1 + Cloudflare Access, se preferir
manter tudo na Cloudflare. Nesse caso as regras por assessor são escritas na mão.

**Requisito não negociável:** toda consulta é filtrada no servidor pelo papel de
quem pede. Esconder um botão no front-end não é controle de acesso.

---

## 4. Modelo de dados

### `assessores`
| coluna | tipo | nota |
|---|---|---|
| id | uuid | |
| nome | text | |
| nivel | text | um dos 10 níveis (§5.1) |
| saldo_inicial | int | migração da régua anterior, definido caso a caso |
| ativo | bool | desligamento não apaga histórico |
| entrou_em | date | usado para apuração proporcional (§9) |

### `usuarios`
| coluna | tipo | nota |
|---|---|---|
| id | uuid | id do Supabase Auth |
| email | text | único, domínio validado |
| assessor_id | uuid nullable | null para quem não é assessor |
| papel | enum | `diretoria` \| `coordenacao` \| `assessor` |
| ativo | bool | |

Quem faz login e não tem linha aqui entra sem acesso a nada.

### `apuracoes`
Uma linha por assessor por mês. É o container do lançamento.

| coluna | tipo | nota |
|---|---|---|
| id | uuid | |
| assessor_id | uuid | |
| mes | date | sempre dia 1 do mês de referência |
| status | enum | `aberta` \| `fechada` |
| fechada_em | timestamptz | |
| fechada_por | uuid | |

Índice único em `(assessor_id, mes)`.

### `lancamentos`
Uma linha por meta por apuração.

| coluna | tipo | nota |
|---|---|---|
| apuracao_id | uuid | |
| meta_codigo | text | `3.1` a `3.9` |
| valor | text | rótulo da escala, percentual ou contagem |
| coins | int | resultado do cálculo, gravado |
| lancado_por | uuid | |
| lancado_em | timestamptz | |

Grave `coins` mesmo sendo derivável: se a tabela de pontuação mudar, o histórico
não pode se reescrever sozinho.

### `metas` e `faixas_pontuacao`
As regras de pontuação ficam **em tabela, não em código**. Mudar o teto de uma
meta é editar registro, não fazer deploy.

`metas`: codigo, nome, descricao, tipo (`escala` \| `percentual` \| `contagem` \|
`livre`), grupo (`recorrente` \| `bonus`), teto, ordem, vigente_de, vigente_ate.

`faixas_pontuacao`: meta_codigo, rotulo, valor_minimo (para percentuais), coins,
ordem.

### `niveis`
codigo, nome, ordem, custo_promocao (custo para sair deste nível).

### `promocoes`
| coluna | tipo |
|---|---|
| assessor_id, de_nivel, para_nivel, custo, checkpoint (date), aprovada_por, criada_em |

### `log`
Tudo que altera saldo ou permissão: quem, o quê, valor anterior, valor novo,
quando. Obrigatório para reabertura e edição de mês fechado.

---

## 5. Regras de negócio

### 5.1 Níveis e custos de promoção

| Transição | Custo (coins) |
|---|---|
| Júnior I → Júnior II | 2.700 |
| Júnior II → Júnior III | 4.000 |
| Júnior III → Pleno I | 6.800 |
| Pleno I → Pleno II | 8.100 |
| Pleno II → Pleno III | 8.100 |
| Pleno III → Sênior I | 8.100 |
| Sênior I → Sênior II | 12.200 |
| Sênior II → Sênior III | 12.200 |
| Sênior III → Partner | 16.200 |

Partner é o topo — sem transição adiante.

### 5.2 Metas recorrentes — teto de 1.300 coins/mês

**3.1 Nota de relacionamento** (máx. 300) — atribuída pela coordenação.
Excelente 300 · Boa 150 · Insatisfatória 0

**3.2 Taxa de churn** (máx. 200) — só conta churn atribuído ao assessor,
conforme motivo no Post Mortem.
0 churns 200 · 1 churn 50 · 2+ churns 0

**3.3 Adesão a feedback** (máx. 200).
Muito 200 · Razoável 100 · Pouco 50 · Nenhum 0

**3.4 Entregas no prazo** (máx. 200) — percentual, base ClickUp.
≥90% 200 · 80–89% 100 · 70–79% 50 · <70% 0

**3.5 Reuniões com clientes** (máx. 200) — percentual, requer ata na lista
"Reunião".
≥90% 200 · 70–89% 100 · 50–69% 50 · <50% 0

**3.6 Presença e cultura** (máx. 200).
Excelente 200 · Bom 100 · Regular 50 · Insatisfatório 0

### 5.3 Metas de bônus — sem teto

**3.7 Upsell de serviços** — por faixa de valor mensal recorrente adicionado:
acima de R$ 2.000 → 300 · R$ 1.000 a 2.000 → 200 · R$ 500 a 1.000 → 100 ·
até R$ 500 → 50 · nenhum → 0. Requer registro na lista "Reunião".

**3.8 Indicação de novos clientes** — 300 coins por cliente indicado e fechado.
Só conta após contrato assinado. Campo é contagem: `coins = qtd × 300`.

**3.9 Certificações** — pontuação sob demanda (Google Ads, Google Analytics,
Meta). Campo livre em coins, definido pela coordenação.

Bônus somam acima da base e **não** entram no cálculo de percentual da base.

### 5.4 Pré-requisitos qualitativos de macro-nível

Nestas três transições, saldo suficiente não efetiva a promoção. O saldo é
mantido até o checkpoint em que o critério for atendido:

- **Júnior III → Pleno I** — avaliação de autonomia nas contas.
- **Pleno III → Sênior I** — gestão autônoma de pelo menos uma conta complexa.
- **Sênior III → Partner** — validação da diretoria, com histórico de receita e
  retenção. Decisão da diretoria, não automática.

Modele como flag booleana por assessor, marcada pela diretoria, com data e
responsável no log.

> **MRR mínimo por nível ficou fora do sistema.** É gestão interna da diretoria
> e não deve aparecer em nenhuma tela nem em nenhum cálculo.

### 5.5 Saldo

```
saldo = saldo_inicial
      + Σ coins de todas as apurações fechadas
      − Σ custos das promoções efetivadas
```

O remanescente **nunca zera**: quem tinha 4.500 e promoveu por 4.000 segue com
500 rumo à transição seguinte.

### 5.6 Checkpoints

Promoção só é efetivada em março, junho, setembro ou dezembro, mesmo que o
saldo tenha sido atingido antes.

---

## 6. Cálculos exatos

Reproduza estas fórmulas do protótipo. Cobrir com teste unitário.

**Percentual da base mensal**
`pct_base = coins_recorrentes_do_mes / 1300 × 100`
Bônus não entram.

**Progresso para o próximo nível**
`pct_nivel = min(100, saldo / custo_da_transicao × 100)`

**Projeção — sempre a 100% da base recorrente, sem bônus**

O mês corrente está aberto até o fechamento do mês seguinte, então ele conta na
projeção, mas só pelo que ainda pode render:

```
potencial_mes_corrente = max(0, 1300 − recorrente_já_lançado_no_mês_corrente)
projetado_no_checkpoint = saldo
                        + potencial_mes_corrente
                        + 1300 × meses_entre(mes_corrente, proximo_checkpoint)
```

**Data provável da promoção**

```
restante = falta_coins − potencial_mes_corrente
mes_alvo = restante <= 0 ? mes_corrente
                         : mes_corrente + ceil(restante / 1300) meses
meses_ate_promocao = meses_entre(mes_corrente, mes_alvo) + 1
data_promocao = primeiro checkpoint em ou após mes_alvo
```

Todos esses cálculos usam a **data real de hoje**, não o mês selecionado no
filtro. Trocar o mês de referência não pode alterar a projeção.

**Média mensal** — média dos últimos 3 meses lançados. Métrica histórica apenas;
não é base de projeção.

**Aproveitamento** — `Σ recorrente / (1300 × meses lançados) × 100`.

---

## 7. Permissões

| Recurso | Diretoria | Coordenação | Assessor |
|---|---|---|---|
| Ver painel de qualquer assessor | ✅ | ✅ | ❌ |
| Ver o próprio painel | — | — | ✅ (só meses fechados) |
| Ver ranking do mês | ✅ | ✅ | ✅ (posição + pódio) |
| Ver saldo e progressão dos colegas | ✅ | ✅ | ❌ |
| Lançar metas em mês aberto | ✅ | ✅ | ❌ |
| Fechar mês | ✅ | ✅ | ❌ |
| Reabrir mês fechado | ✅ | ❌ | ❌ |
| Editar lançamento de mês fechado | ✅ | ❌ | ❌ |
| Efetivar promoção | ✅ | ❌ | ❌ |
| Marcar pré-requisito de macro-nível | ✅ | ❌ | ❌ |
| Editar nível, saldo inicial, cadastro | ✅ | ❌ | ❌ |
| Editar tabela de pontuação | ✅ | ❌ | ❌ |
| Ver log | ✅ | ❌ | ❌ |

**O que o assessor nunca vê:** saldo, nível, progressão, data de promoção ou
nota de qualquer colega. Do time, só o ranking por percentual da base do mês —
métrica em que todos disputam o mesmo teto de 1.300 — com o pódio nomeado e a
própria posição. Ninguém abaixo do terceiro lugar é nomeado.

Implemente com RLS: o assessor lê apenas linhas cujo `assessor_id` casa com o
dele **e** cuja apuração está fechada.

---

## 8. Telas

### 8.1 Coordenação e diretoria

**Equipe** — dois blocos independentes.

*Visão acumulada* (sem filtro de mês): cards de "Prontos por saldo" e "Próximo
checkpoint", e tabela ordenada por percentual de progresso: assessor, nível
atual, próximo nível, saldo, meta (custo), barra de progresso com percentual de
uma casa decimal, e data provável da promoção com quantos meses isso leva a 100%.

*Apuração do mês* (com filtro): selo Aberto/Fechado, base do mês com barra e
percentual, bônus, total e situação no checkpoint.

**Lançar mês** — grade com assessores nas linhas e as 9 metas nas colunas,
primeira coluna fixa na rolagem horizontal. Cada campo mostra os coins que gerou
logo abaixo. Total e percentual da base ao final da linha. Botão "Limpar mês"
por assessor, com confirmação. No cabeçalho: status do mês, botão "Fechar mês"
(diretoria e coordenação) e "Reabrir mês" (só diretoria).

Mês fechado: campos viram texto. Coordenação lê "peça a reabertura à diretoria";
diretoria vê alerta de que a edição altera saldo já divulgado.

**Assessor** — mesma tela do §8.2, com seletor para escolher quem visualizar.

**Ajustes** (só diretoria) — nível, saldo inicial, dados de exemplo, exportação
JSON, histórico de promoções.

### 8.2 Painel do assessor

Ordem das seções, de cima para baixo:

1. **Panorama** (bloco escuro): saldo acumulado em destaque, anel de progresso
   com o percentual rumo ao próximo nível no canto superior direito, barra
   nível atual → próximo, e faixa com seis métricas acumuladas — média mensal,
   aproveitamento, total já ganho, bônus acumulado, gasto em promoções e melhor
   mês.
2. **Checkpoint**: próximo checkpoint, projeção a 100% no checkpoint com o custo
   da transição ao lado, e bloco chapado destacando a **data provável da
   promoção** — o elemento mais forte do painel. Fica verde quando o saldo já
   cobre a transição.
3. **Histórico**: barras empilhadas dos últimos 12 meses, base recorrente em
   laranja e bônus em verde, eixo vertical com escala, linha tracejada no teto
   de 1.300, checkpoints marcados.
4. **Detalhamento do mês** (aqui fica o filtro de mês): base do mês com o quanto
   falta em percentual, requisito qualitativo quando aplicável, e tabela meta a
   meta com valor lançado, barra e coins sobre o máximo.

Para o assessor logado, acrescente o **ranking do mês** ao final e remova o
seletor de assessor.

### 8.3 Comportamento do filtro de mês

O filtro governa **apenas** o detalhamento do mês. Panorama, checkpoint,
projeção e histórico são ancorados na data real. Padrão de abertura: **mês
anterior**, porque o fechamento acontece na primeira semana do mês seguinte.

---

## 9. Casos de borda

**Assessor que entra no meio do mês** — primeira apuração proporcional ou
ignorada? Decidir antes de lançar o primeiro mês. Sugestão: primeiro mês
incompleto não é apurado, e `entrou_em` fica registrado.

**Assessor desligado** — `ativo = false`. Some das telas, permanece no banco. O
usuário perde acesso na hora.

**Churn em disputa** — a apuração não pode ficar travada esperando o Post
Mortem. Permita fechar o mês com a meta 3.2 pendente e ajustar depois via
reabertura, com log.

**Correção depois do fechamento** — só diretoria, sempre com log, e o assessor
deve ver que houve ajuste. Um saldo que muda sem explicação destrói a confiança
no programa.

**Mudança na tabela de pontuação** — versionada por vigência. Apurações antigas
mantêm os coins gravados.

**Promoção com pré-requisito pendente** — saldo fica retido, não é debitado, e o
assessor aparece como "apto, com pendência" até o próximo checkpoint.

**Dois checkpoints sem apuração lançada** — alerta na tela da coordenação. Mês
sem lançamento não é mês com zero coins: são coisas diferentes e o cálculo de
aproveitamento precisa distinguir.

---

## 10. Identidade visual

Aplicar a skill `trilha-brand`.

- Laranja Trilha `#EE4C20` — acento, números de destaque, barras. Nunca área.
- Verde Grafite `#454C47` — texto padrão, cabeçalho de tabela.
- Preto Trilha `#212121` — blocos escuros (panorama).
- Bege Trilha `#E9E8E4` — fundo padrão.
- Verde Gelo `#C1CFCA` e Verde Névoa `#9EAFAA` — superfícies, divisores.
- Verde de confirmação `#8FB08A` — saldo suficiente, meta batida.

Tipografia PolySans (Bulky para títulos, Neutral para corpo), fallback Inter.
Cantos de 4 a 8px. Tabelas com cabeçalho escuro, zebrado claro, sem bordas
verticais. Números sempre em `tabular-nums`.

---

## 11. Ordem de implementação

1. Modelo de dados e tabelas de pontuação, com seed do JSON exportado.
2. Motor de cálculo — saldo, percentuais, projeção, checkpoint. **Com testes.**
   As fórmulas do §6 são o contrato.
3. Telas de coordenação sem autenticação, rodando localmente com dados reais de
   um mês.
4. Auth Google + papéis + RLS.
5. Painel do assessor e ranking.
6. Log e fluxo de reabertura.
7. Notificação de fechamento do mês (integrável ao n8n).

Não pule a etapa 3. É onde aparecem os casos que nem o protótipo nem este
briefing previram.

---

## 12. Pendências de decisão

Resolver antes ou durante a etapa 3:

- **Saldo inicial dos 7 assessores.** O sistema nasce do zero e a régua nova é
  diferente da anterior. Definir o número com critério explícito e registrar o
  critério — isso pesa mais na adoção do programa do que qualquer tela.
- **Pódio nomeado no ranking** é confortável para o time, ou melhor mostrar só a
  posição relativa?
- **Apuração proporcional** para quem entra no meio do mês.
