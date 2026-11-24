-- Trilha Hub — remover usuários (Gestão → Usuários).
--
-- Remover tira o acesso e tira a pessoa da lista. Duas situações:
--   * sem histórico no Coins/Hub → apaga o login (auth.users) e a linha
--     em `usuarios` de vez. Se a pessoa entrar de novo um dia, volta
--     como pendente de aprovação, como qualquer primeiro login;
--   * com histórico (fechou mês, lançou meta, aprovou promoção, marcou
--     requisito ou aparece no log) → apagar quebraria esse histórico.
--     A pessoa fica inativa e marcada como removida (`removido_em`),
--     some da lista principal e pode ser restaurada.
-- O cadastro de assessor no Coins (`assessores`) nunca é tocado aqui.
--
-- Travas: só a diretoria remove; ninguém remove a si mesmo; a última
-- pessoa ativa da diretoria não pode ser removida. Tudo vai para o log.
--
-- Pode rodar de novo sem erro (idempotente).

alter table usuarios add column if not exists removido_em timestamptz;

create or replace function public.remover_usuario(usuario_id_alvo uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo usuarios%rowtype;
  tem_historico boolean;
begin
  if coalesce(usuario_papel() = 'diretoria', false) = false then
    raise exception 'Só a diretoria remove usuários.';
  end if;
  if usuario_id_alvo = auth.uid() then
    raise exception 'Você não pode remover o seu próprio acesso.';
  end if;

  select * into alvo from usuarios where id = usuario_id_alvo;
  if not found then
    raise exception 'Usuário não encontrado.';
  end if;

  if alvo.papel = 'diretoria' and alvo.ativo and (
    select count(*) from usuarios where papel = 'diretoria' and ativo and removido_em is null
  ) <= 1 then
    raise exception 'Não dá para remover a última pessoa ativa da diretoria.';
  end if;

  tem_historico :=
    exists (select 1 from apuracoes where fechada_por = usuario_id_alvo)
    or exists (select 1 from lancamentos where lancado_por = usuario_id_alvo)
    or exists (select 1 from promocoes where aprovada_por = usuario_id_alvo)
    or exists (select 1 from requisitos_macro_nivel where marcado_por = usuario_id_alvo)
    or exists (select 1 from log where usuario_id = usuario_id_alvo);

  insert into log (usuario_id, acao, entidade, entidade_id, valor_anterior, valor_novo)
  values (
    auth.uid(),
    'remover_usuario',
    'usuario',
    usuario_id_alvo,
    jsonb_build_object('email', alvo.email, 'papel', alvo.papel, 'assessor_id', alvo.assessor_id, 'ativo', alvo.ativo),
    jsonb_build_object('modo', case when tem_historico then 'arquivado' else 'excluido' end)
  );

  if tem_historico then
    update usuarios set ativo = false, removido_em = now() where id = usuario_id_alvo;
    delete from coordenacoes_assessores where usuario_id = usuario_id_alvo;
    return 'arquivado';
  end if;

  -- O login sai junto: `usuarios.id` referencia auth.users com cascade.
  delete from auth.users where id = usuario_id_alvo;
  delete from usuarios where id = usuario_id_alvo;
  return 'excluido';
end;
$$;

create or replace function public.restaurar_usuario(usuario_id_alvo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(usuario_papel() = 'diretoria', false) = false then
    raise exception 'Só a diretoria restaura usuários.';
  end if;
  -- Volta para a lista ainda inativa: a diretoria decide se libera de novo.
  update usuarios set removido_em = null where id = usuario_id_alvo and removido_em is not null;
  if not found then
    raise exception 'Usuário não encontrado entre os removidos.';
  end if;
  insert into log (usuario_id, acao, entidade, entidade_id)
  values (auth.uid(), 'restaurar_usuario', 'usuario', usuario_id_alvo);
end;
$$;

revoke all on function public.remover_usuario(uuid) from public;
revoke all on function public.restaurar_usuario(uuid) from public;
grant execute on function public.remover_usuario(uuid) to authenticated;
grant execute on function public.restaurar_usuario(uuid) to authenticated;
