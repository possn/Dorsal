-- Dorsal: estrutura da base de dados (Supabase / Postgres).
-- Correr uma vez no SQL Editor do projecto. Não contém dados nem códigos de grupo.
-- Segurança: não há contas. Cada pedido envia o código do grupo no cabeçalho "x-grupo";
-- as regras abaixo só mostram e deixam alterar dados desse grupo.

create or replace function public.grupo_atual() returns text
language sql stable set search_path = public as $$
  select nullif(lower(coalesce(current_setting('request.headers', true)::json->>'x-grupo', '')), '')
$$;

create table if not exists public.grupos (
  codigo text primary key check (codigo ~ '^[a-z0-9]{6,40}$'),
  nome text not null default '' check (char_length(nome) <= 40),
  logo text not null default '' check (char_length(logo) <= 60000),  -- imagem pequena em data URL
  criado_em timestamptz not null default now()
);

create or replace function public.grupo_valido() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.grupos where codigo = public.grupo_atual())
$$;

create table if not exists public.provas (
  id text primary key check (char_length(id) <= 80),
  nome text not null check (char_length(nome) between 1 and 120),
  data date not null,
  concelho text not null default '',
  distrito text not null default '',
  distancias text not null default '',
  inscricao text not null default '',
  info text not null default '',
  fonte text not null default '',
  nota text not null default '',
  grupo text references public.grupos(codigo) on delete cascade,  -- null = prova do calendário público
  criado_por uuid,
  criado_em timestamptz not null default now()
);
create index if not exists provas_data on public.provas(data);

create table if not exists public.membros (
  id uuid primary key default gen_random_uuid(),
  grupo text not null references public.grupos(codigo) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 30),
  criado_em timestamptz not null default now()
);

create table if not exists public.presencas (
  grupo text not null references public.grupos(codigo) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  prova_id text not null references public.provas(id) on delete cascade,
  estado text not null check (estado in ('inscrito','vou','talvez')),
  percurso text not null default '' check (char_length(percurso) <= 40),
  boleia text not null default '' check (boleia in ('', 'oferece', 'precisa')),
  lugares smallint not null default 0 check (lugares between 0 and 8),
  tempo text not null default '' check (tempo ~ '^([0-9]{1,3}:[0-5][0-9](:[0-5][0-9])?)?$'),
  atualizado timestamptz not null default now(),
  primary key (membro_id, prova_id)
);

create table if not exists public.cliques (
  id bigint generated always as identity primary key,
  grupo text not null references public.grupos(codigo) on delete cascade,
  prova_id text not null,
  membro_id uuid,
  em timestamptz not null default now()
);

alter table public.grupos enable row level security;
alter table public.provas enable row level security;
alter table public.membros enable row level security;
alter table public.presencas enable row level security;
alter table public.cliques enable row level security;

drop policy if exists grupos_ler on public.grupos;
create policy grupos_ler on public.grupos for select using (codigo = public.grupo_atual());
drop policy if exists grupos_alterar on public.grupos;
create policy grupos_alterar on public.grupos for update using (codigo = public.grupo_atual()) with check (codigo = public.grupo_atual());

drop policy if exists provas_ler on public.provas;
create policy provas_ler on public.provas for select using (grupo is null or grupo = public.grupo_atual());
drop policy if exists provas_criar on public.provas;
create policy provas_criar on public.provas for insert with check (public.grupo_valido() and (grupo is null or grupo = public.grupo_atual()));
drop policy if exists provas_alterar on public.provas;
create policy provas_alterar on public.provas for update using (public.grupo_valido() and (grupo is null or grupo = public.grupo_atual())) with check (grupo is null or grupo = public.grupo_atual());
drop policy if exists provas_apagar on public.provas;
create policy provas_apagar on public.provas for delete using (grupo = public.grupo_atual());

drop policy if exists membros_ler on public.membros;
create policy membros_ler on public.membros for select using (grupo = public.grupo_atual());
drop policy if exists membros_criar on public.membros;
create policy membros_criar on public.membros for insert with check (grupo = public.grupo_atual() and public.grupo_valido());

drop policy if exists presencas_ler on public.presencas;
create policy presencas_ler on public.presencas for select using (grupo = public.grupo_atual());
drop policy if exists presencas_criar on public.presencas;
create policy presencas_criar on public.presencas for insert with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists presencas_alterar on public.presencas;
create policy presencas_alterar on public.presencas for update using (grupo = public.grupo_atual()) with check (grupo = public.grupo_atual());
drop policy if exists presencas_apagar on public.presencas;
create policy presencas_apagar on public.presencas for delete using (grupo = public.grupo_atual());

drop policy if exists cliques_ler on public.cliques;
create policy cliques_ler on public.cliques for select using (grupo = public.grupo_atual());
drop policy if exists cliques_criar on public.cliques;
create policy cliques_criar on public.cliques for insert with check (grupo = public.grupo_atual() and public.grupo_valido());

grant select, insert, update, delete on public.provas, public.membros, public.presencas to anon;
grant select on public.grupos to anon;
grant update (nome, logo) on public.grupos to anon;
grant select, insert on public.cliques to anon;

-- Criar grupos a partir da app: devolve o código secreto do grupo novo.
create or replace function public.criar_grupo(p_nome text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_nome text := btrim(coalesce(p_nome, '')); v_codigo text;
begin
  if char_length(v_nome) < 1 or char_length(v_nome) > 40 then raise exception 'nome inválido' using errcode = '22023'; end if;
  if (select count(*) from public.grupos where criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'demasiados grupos criados, tenta mais tarde' using errcode = '54000'; end if;
  loop
    v_codigo := substr(md5(random()::text || clock_timestamp()::text) || md5(random()::text), 1, 16);
    exit when not exists (select 1 from public.grupos where codigo = v_codigo);
  end loop;
  insert into public.grupos (codigo, nome) values (v_codigo, v_nome);
  return v_codigo;
end; $$;
revoke all on function public.criar_grupo(text) from public;
grant execute on function public.criar_grupo(text) to anon;

-- Conversa por prova
create table if not exists public.comentarios (
  id bigint generated always as identity primary key,
  grupo text not null references public.grupos(codigo) on delete cascade,
  prova_id text not null,
  membro_id uuid not null references public.membros(id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 500),
  criado_em timestamptz not null default now()
);
create index if not exists comentarios_grupo_prova on public.comentarios(grupo, prova_id, criado_em);
alter table public.comentarios enable row level security;
drop policy if exists comentarios_ler on public.comentarios;
create policy comentarios_ler on public.comentarios for select using (grupo = public.grupo_atual());
drop policy if exists comentarios_criar on public.comentarios;
create policy comentarios_criar on public.comentarios for insert with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists comentarios_apagar on public.comentarios;
create policy comentarios_apagar on public.comentarios for delete using (grupo = public.grupo_atual());
grant select, insert, delete on public.comentarios to anon;

-- Notificações push (conversas). A função supabase/functions/notificar envia as notificações.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  criado_em timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;
create table if not exists public.subscricoes (
  endpoint text not null check (char_length(endpoint) between 10 and 1000),
  grupo text not null references public.grupos(codigo) on delete cascade,
  membro_id uuid not null references public.membros(id) on delete cascade,
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  criado_em timestamptz not null default now(),
  primary key (endpoint, grupo)
);
alter table public.subscricoes enable row level security;
drop policy if exists subscricoes_ler on public.subscricoes;
create policy subscricoes_ler on public.subscricoes for select using (grupo = public.grupo_atual());
drop policy if exists subscricoes_criar on public.subscricoes;
create policy subscricoes_criar on public.subscricoes for insert with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists subscricoes_alterar on public.subscricoes;
create policy subscricoes_alterar on public.subscricoes for update using (grupo = public.grupo_atual()) with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists subscricoes_apagar on public.subscricoes;
create policy subscricoes_apagar on public.subscricoes for delete using (grupo = public.grupo_atual());
grant select (endpoint, grupo, membro_id) on public.subscricoes to anon;
grant insert, update, delete on public.subscricoes to anon;
alter table public.comentarios add column if not exists notificado boolean not null default false;
revoke update on public.comentarios from anon;

alter table public.presencas add column if not exists km numeric(5,1) check (km is null or (km >= 0 and km <= 400));
alter table public.presencas add column if not exists dplus integer check (dplus is null or (dplus >= 0 and dplus <= 20000));

-- Trilhos GPS importados de GPX
create table if not exists public.trilhos (
  grupo text not null references public.grupos(codigo) on delete cascade,
  prova_id text not null,
  membro_id uuid not null references public.membros(id) on delete cascade,
  km numeric(6,2) not null check (km >= 0 and km <= 400),
  dplus integer not null check (dplus >= 0 and dplus <= 20000),
  dminus integer not null default 0 check (dminus >= 0 and dminus <= 20000),
  duracao_s integer check (duracao_s is null or (duracao_s >= 0 and duracao_s <= 604800)),
  inicio timestamptz,
  pontos text not null check (char_length(pontos) <= 120000),
  elev text not null default '' check (char_length(elev) <= 60000),
  atualizado timestamptz not null default now(),
  primary key (membro_id, prova_id)
);
create index if not exists trilhos_grupo_prova on public.trilhos(grupo, prova_id);
alter table public.trilhos enable row level security;
drop policy if exists trilhos_ler on public.trilhos;
create policy trilhos_ler on public.trilhos for select using (grupo = public.grupo_atual());
drop policy if exists trilhos_criar on public.trilhos;
create policy trilhos_criar on public.trilhos for insert with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists trilhos_alterar on public.trilhos;
create policy trilhos_alterar on public.trilhos for update using (grupo = public.grupo_atual()) with check (grupo = public.grupo_atual() and exists (select 1 from public.membros m where m.id = membro_id and m.grupo = public.grupo_atual()));
drop policy if exists trilhos_apagar on public.trilhos;
create policy trilhos_apagar on public.trilhos for delete using (grupo = public.grupo_atual());
grant select, insert, update, delete on public.trilhos to anon;

-- ---------- avisos (v2 da função notificar) ----------
-- Registo de avisos já enviados, para não repetir (só a função, com a chave de serviço, lhe acede).
create table if not exists public.notif_log (
  chave text primary key,
  criado_em timestamptz not null default now()
);
alter table public.notif_log enable row level security;
revoke all on public.notif_log from anon, authenticated;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Lembrete na véspera da prova, todos os dias às 18:00 UTC (18h no inverno, 19h no verão em Lisboa).
-- Substitui <ANON_KEY> pela chave anónima de config.js.
-- select cron.schedule('dorsal-lembretes','0 18 * * *', $$select net.http_post(
--   url:='https://gubjzbirpkwrxoreqvfm.supabase.co/functions/v1/notificar',
--   headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
--   body:='{"tipo":"lembretes"}'::jsonb)$$);
