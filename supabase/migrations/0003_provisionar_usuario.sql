-- Provisiona automaticamente uma linha em `usuarios` no primeiro login
-- de cada pessoa (trigger em auth.users). Ela nasce INATIVA e sem
-- papel real de acesso — continua valendo o "quem loga sem cadastro
-- não entra em nada" do §4 — só que agora a diretoria não precisa mais
-- rodar SQL na mão a cada pessoa nova: aprova pela tela de Ajustes.

create or replace function public.criar_usuario_no_primeiro_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into usuarios (id, email, papel, ativo)
  values (new.id, new.email, 'assessor', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_auth_user on auth.users;
create trigger ao_criar_auth_user
  after insert on auth.users
  for each row execute function public.criar_usuario_no_primeiro_login();
