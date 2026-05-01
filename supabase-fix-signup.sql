-- =============================================================================
-- SOMA - Correção definitiva do erro "database error saving new user"
-- Cole e execute no SQL Editor do Supabase (supabase.com → SQL Editor)
-- =============================================================================

-- Remove o trigger que está bloqueando o cadastro.
-- O app já cria o perfil automaticamente após o login, então o trigger
-- não é necessário e estava causando o erro de RLS (auth.uid() = NULL
-- dentro do contexto de trigger).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- =============================================================================
-- Garante que a tabela perfil exista (caso ainda não tenha rodado o schema)
-- =============================================================================
create table if not exists public.perfil (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  nome text,
  nome_publico text,
  categoria text,
  foto_url text,
  tipo_propriedade text,
  tipo_tracao text,
  telefone text,
  cpf text unique,
  cidade text,
  uf text,
  termos_aceite_em timestamptz,
  assinante boolean not null default false,
  plano text not null default 'free',
  meta_mensal numeric not null default 10000,
  dias_folga_semana integer not null default 2,
  considerar_ipva_automatico boolean not null default true,
  considerar_seguro_automatico boolean not null default true,
  considerar_depreciacao_automatico boolean not null default true,
  considerar_internet_automatico boolean not null default false,
  considerar_manutencoes_basicas boolean not null default false,
  considerar_custo_soma_automatico boolean not null default false,
  participar_ranking_soma boolean not null default false,
  mostrar_ganhos_liquidos_brutos boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilita RLS
alter table public.perfil enable row level security;

-- Recria todas as políticas (idempotente)
drop policy if exists "perfil_select_own"  on public.perfil;
drop policy if exists "perfil_insert_own"  on public.perfil;
drop policy if exists "perfil_update_own"  on public.perfil;
drop policy if exists "perfil_delete_own"  on public.perfil;

create policy "perfil_select_own" on public.perfil
  for select using (auth.uid() = id);

-- INSERT: permite tanto usuário autenticado quanto service_role (sem JWT)
create policy "perfil_insert_own" on public.perfil
  for insert with check (
    auth.uid() = id
    OR current_setting('request.jwt.claims', true) = ''
  );

create policy "perfil_update_own" on public.perfil
  for update using (auth.uid() = id);

create policy "perfil_delete_own" on public.perfil
  for delete using (auth.uid() = id);

-- Colunas extras (idempotentes)
alter table public.perfil add column if not exists foto_url text;
alter table public.perfil add column if not exists tipo_propriedade text;
alter table public.perfil add column if not exists tipo_tracao text;

-- Remove NOT NULL do cpf (deve ser opcional no cadastro)
alter table public.perfil alter column cpf drop not null;

-- =============================================================================
-- Colunas que podem estar faltando na tabela veiculo
-- (adicionadas em versões mais recentes do schema)
-- =============================================================================
alter table public.veiculo add column if not exists tipo_propriedade text;
alter table public.veiculo add column if not exists tipo_tracao text;
alter table public.veiculo add column if not exists hodometro_inicial numeric;
alter table public.veiculo add column if not exists valor_fipe numeric;
alter table public.veiculo add column if not exists valor_parcela numeric;
alter table public.veiculo add column if not exists tipo_aluguel text;
alter table public.veiculo add column if not exists valor_aluguel numeric;
alter table public.veiculo add column if not exists tem_seguro boolean default false;
alter table public.veiculo add column if not exists tipo_seguro text;
alter table public.veiculo add column if not exists valor_seguro numeric;
alter table public.veiculo add column if not exists isento_ipva boolean default false;
alter table public.veiculo add column if not exists considerar_ipva_automatico boolean default true;
alter table public.veiculo add column if not exists gasolina_valor numeric;
alter table public.veiculo add column if not exists gasolina_consumo_km_l numeric;
alter table public.veiculo add column if not exists etanol_valor numeric;
alter table public.veiculo add column if not exists etanol_consumo_km_l numeric;
alter table public.veiculo add column if not exists gnv_valor numeric;
alter table public.veiculo add column if not exists gnv_consumo_km_m3 numeric;
alter table public.veiculo add column if not exists consumo_principal text;
alter table public.veiculo add column if not exists consumo_kwh numeric;
alter table public.veiculo add column if not exists valor_kwh numeric;
alter table public.veiculo add column if not exists depreciacao_percentual numeric;
alter table public.veiculo add column if not exists dia_vencimento_seguro integer;
alter table public.veiculo add column if not exists uf_placa text;

alter table public.veiculo add column if not exists bateria numeric;

-- Colunas adicionais da tabela plataformas (podem não existir em instâncias antigas)
alter table public.plataformas add column if not exists tipo text default 'outro';
alter table public.plataformas add column if not exists fixa boolean not null default false;

-- Colunas adicionais da tabela ganhos (podem não existir em instâncias antigas)
alter table public.ganhos add column if not exists plataforma_id uuid references public.plataformas(id) on delete set null;
alter table public.ganhos add column if not exists observacao text;

-- Coluna faltante na tabela jornadas
alter table public.jornadas add column if not exists tempo_total_minutos integer default 0;
