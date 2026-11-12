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
  nome text not null default '',
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
grant select, insert on public.cliques to anon;
