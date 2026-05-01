-- ============================================================================
-- SOMA - Schema Supabase (Idempotente)
-- Sistema Orçamentário para Motorista de Aplicativo
-- ============================================================================
-- Execute este arquivo no SQL Editor do Supabase.
-- Todas as tabelas em PORTUGUÊS.
-- RLS habilitado em todas as tabelas com policies por auth.uid().
-- ============================================================================

-- Habilita extensão pgcrypto para gen_random_uuid
create extension if not exists pgcrypto;

-- ============================================================================
-- TABELA: perfil (substitui "profile")
-- ============================================================================
create table if not exists public.perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nome text,
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

alter table public.perfil enable row level security;
drop policy if exists "perfil_select_own" on public.perfil;
drop policy if exists "perfil_insert_own" on public.perfil;
drop policy if exists "perfil_update_own" on public.perfil;
drop policy if exists "perfil_delete_own" on public.perfil;
create policy "perfil_select_own" on public.perfil for select using (auth.uid() = id);
create policy "perfil_insert_own" on public.perfil for insert with check (auth.uid() = id);
create policy "perfil_update_own" on public.perfil for update using (auth.uid() = id);
create policy "perfil_delete_own" on public.perfil for delete using (auth.uid() = id);

-- ============================================================================
-- TABELA: veiculo (sem acento)
-- ============================================================================
create table if not exists public.veiculo (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  placa text,
  uf_placa text,
  nome_veiculo text,
  ano integer,
  km_atual numeric,
  hodometro_inicial numeric,
  valor_fipe numeric,
  tipo_propriedade text,
  valor_parcela numeric,
  data_vencimento date,
  data_fim_contrato date,
  financiamento_lancar_automaticamente boolean default false,
  tipo_aluguel text,
  valor_aluguel numeric,
  vencimento date,
  dia_semana_vencimento integer,
  aluguel_lancar_automaticamente boolean default false,
  tem_seguro boolean default false,
  tipo_seguro text,
  valor_seguro numeric,
  data_inicio_seguro date,
  data_fim_seguro date,
  seguro_lancar_automaticamente boolean default false,
  isento_ipva boolean default false,
  considerar_ipva_automatico boolean default true,
  tipo_tracao text,
  gasolina_valor numeric,
  gasolina_consumo_km_l numeric,
  etanol_valor numeric,
  etanol_consumo_km_l numeric,
  gnv_valor numeric,
  gnv_consumo_km_m3 numeric,
  consumo_principal text,
  bateria numeric,
  consumo_kwh numeric,
  valor_kwh numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists veiculo_profile_idx on public.veiculo(profile_id);

alter table public.veiculo enable row level security;
drop policy if exists "veiculo_all_own" on public.veiculo;
create policy "veiculo_all_own" on public.veiculo for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: jornadas
-- ============================================================================
create table if not exists public.jornadas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  veiculo_id uuid references public.veiculo(id) on delete set null,
  data_jornada date not null,
  horas integer not null default 0,
  minutos integer not null default 0,
  km_percorrido numeric not null default 0,
  tempo_total_minutos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jornadas_profile_data_idx on public.jornadas(profile_id, data_jornada desc);

alter table public.jornadas enable row level security;
drop policy if exists "jornadas_all_own" on public.jornadas;
create policy "jornadas_all_own" on public.jornadas for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: ganhos
-- ============================================================================
create table if not exists public.ganhos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  jornada_id uuid references public.jornadas(id) on delete set null,
  plataforma_id uuid,
  data_ganho date not null,
  valor numeric not null default 0,
  corridas integer not null default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ganhos_profile_data_idx on public.ganhos(profile_id, data_ganho desc);

alter table public.ganhos enable row level security;
drop policy if exists "ganhos_all_own" on public.ganhos;
create policy "ganhos_all_own" on public.ganhos for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: despesas
-- ============================================================================
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  jornada_id uuid references public.jornadas(id) on delete set null,
  categoria text not null,
  data_despesa date not null,
  valor numeric not null default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists despesas_profile_data_idx on public.despesas(profile_id, data_despesa desc);

alter table public.despesas enable row level security;
drop policy if exists "despesas_all_own" on public.despesas;
create policy "despesas_all_own" on public.despesas for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: abastecimentos
-- ============================================================================
create table if not exists public.abastecimentos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  veiculo_id uuid references public.veiculo(id) on delete set null,
  data_abastecimento date not null,
  valor_total numeric not null default 0,
  litros numeric,
  preco_por_litro numeric,
  tipo_combustivel text not null default 'gasolina',
  autonomia_km_litro numeric,
  consumo_kwh numeric,
  valor_kwh numeric,
  uso text not null default 'trabalho',
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists abastecimentos_profile_data_idx on public.abastecimentos(profile_id, data_abastecimento desc);

alter table public.abastecimentos enable row level security;
drop policy if exists "abastecimentos_all_own" on public.abastecimentos;
create policy "abastecimentos_all_own" on public.abastecimentos for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: plataformas
-- ============================================================================
create table if not exists public.plataformas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  nome text not null,
  tipo text,
  ativa boolean not null default true,
  fixa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists plataformas_profile_idx on public.plataformas(profile_id);

alter table public.plataformas enable row level security;
drop policy if exists "plataformas_all_own" on public.plataformas;
create policy "plataformas_all_own" on public.plataformas for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: manutencoes
-- ============================================================================
create table if not exists public.manutencoes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  veiculo_id uuid references public.veiculo(id) on delete set null,
  tipo_manutencao text not null,
  data_manutencao date not null,
  valor numeric not null default 0,
  km_troca numeric,
  duracao_km numeric,
  duracao_meses integer,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists manutencoes_profile_idx on public.manutencoes(profile_id);

alter table public.manutencoes enable row level security;
drop policy if exists "manutencoes_all_own" on public.manutencoes;
create policy "manutencoes_all_own" on public.manutencoes for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: configuracoes_usuario
-- ============================================================================
create table if not exists public.configuracoes_usuario (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  chave text not null,
  valor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(profile_id, chave)
);
create index if not exists configuracoes_usuario_profile_idx on public.configuracoes_usuario(profile_id);

alter table public.configuracoes_usuario enable row level security;
drop policy if exists "configuracoes_usuario_all_own" on public.configuracoes_usuario;
create policy "configuracoes_usuario_all_own" on public.configuracoes_usuario for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: despesas_fixas
-- ============================================================================
create table if not exists public.despesas_fixas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  veiculo_id uuid references public.veiculo(id) on delete set null,
  tipo text not null,
  descricao text,
  valor_mensal numeric not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists despesas_fixas_profile_idx on public.despesas_fixas(profile_id);

alter table public.despesas_fixas enable row level security;
drop policy if exists "despesas_fixas_all_own" on public.despesas_fixas;
create policy "despesas_fixas_all_own" on public.despesas_fixas for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: conferencias_hodometro
-- ============================================================================
create table if not exists public.conferencias_hodometro (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  veiculo_id uuid references public.veiculo(id) on delete set null,
  data_conferencia date not null,
  hodometro_anterior numeric not null default 0,
  hodometro_atual numeric not null default 0,
  km_total_periodo numeric not null default 0,
  km_trabalho_periodo numeric not null default 0,
  km_pessoal_periodo numeric not null default 0,
  percentual_trabalho numeric not null default 0,
  percentual_pessoal numeric not null default 0,
  custo_estimado_trabalho numeric not null default 0,
  custo_estimado_pessoal numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conferencias_hodometro_profile_idx on public.conferencias_hodometro(profile_id);

alter table public.conferencias_hodometro enable row level security;
drop policy if exists "conferencias_hodometro_all_own" on public.conferencias_hodometro;
create policy "conferencias_hodometro_all_own" on public.conferencias_hodometro for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: assinaturas
-- ============================================================================
create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  plano text not null default 'free',
  assinante boolean not null default false,
  data_inicio date,
  data_fim date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists assinaturas_profile_idx on public.assinaturas(profile_id);

alter table public.assinaturas enable row level security;
drop policy if exists "assinaturas_all_own" on public.assinaturas;
create policy "assinaturas_all_own" on public.assinaturas for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: ipva_aliquotas (pública para leitura)
-- ============================================================================
create table if not exists public.ipva_aliquotas (
  id uuid primary key default gen_random_uuid(),
  uf text not null,
  tipo_veiculo text not null default 'passeio',
  tipo_tracao text not null default 'flex',
  aliquota numeric not null default 0.04,
  tem_isencao boolean not null default false,
  percentual_reducao numeric,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ipva_aliquotas enable row level security;
drop policy if exists "ipva_aliquotas_select_all" on public.ipva_aliquotas;
create policy "ipva_aliquotas_select_all" on public.ipva_aliquotas for select using (true);

-- Seed inicial de alíquotas (idempotente)
insert into public.ipva_aliquotas (uf, tipo_veiculo, tipo_tracao, aliquota, tem_isencao, percentual_reducao, observacao)
select * from (values
  ('SP','passeio','flex',0.04,false,null,'Alíquota padrão'),
  ('SP','passeio','eletrico',0.0,true,100,'Isento em SP'),
  ('SP','passeio','hibrido',0.04,false,null,null),
  ('SP','passeio','gnv',0.03,false,null,null),
  ('RJ','passeio','flex',0.04,false,null,null),
  ('RJ','passeio','eletrico',0.0,true,100,'Isento em RJ'),
  ('MG','passeio','flex',0.04,false,null,null),
  ('PR','passeio','flex',0.035,false,null,null),
  ('RS','passeio','flex',0.03,false,null,null),
  ('SC','passeio','flex',0.02,false,null,null),
  ('BA','passeio','flex',0.025,false,null,null),
  ('CE','passeio','flex',0.025,false,null,null),
  ('PE','passeio','flex',0.025,false,null,null),
  ('GO','passeio','flex',0.0375,false,null,null),
  ('DF','passeio','flex',0.035,false,null,null),
  ('ES','passeio','flex',0.02,false,null,null)
) as v(uf,tipo_veiculo,tipo_tracao,aliquota,tem_isencao,percentual_reducao,observacao)
where not exists (
  select 1 from public.ipva_aliquotas a
  where a.uf = v.uf and a.tipo_veiculo = v.tipo_veiculo and a.tipo_tracao = v.tipo_tracao
);

-- ============================================================================
-- ALTERAÇÕES: jornadas (modo automático/manual + status + GPS)
-- ============================================================================
alter table public.jornadas add column if not exists modo_jornada text not null default 'manual';
alter table public.jornadas add column if not exists status text not null default 'encerrada';
alter table public.jornadas add column if not exists started_at timestamptz;
alter table public.jornadas add column if not exists ended_at timestamptz;
alter table public.jornadas add column if not exists tempo_efetivo_minutos integer not null default 0;
alter table public.jornadas add column if not exists km_percorrido_real numeric not null default 0;
alter table public.jornadas add column if not exists ultima_pausa_em timestamptz;

create index if not exists jornadas_profile_status_idx on public.jornadas(profile_id, status);

-- ============================================================================
-- ALTERAÇÕES: perfil (categoria do motorista para ranking)
-- ============================================================================
alter table public.perfil add column if not exists categoria text;
alter table public.perfil add column if not exists nome_publico text;

-- ============================================================================
-- TABELA: pontos_jornada (rastros GPS)
-- ============================================================================
create table if not exists public.pontos_jornada (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.perfil(id) on delete cascade,
  jornada_id uuid not null references public.jornadas(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  speed double precision,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists pontos_jornada_jornada_idx on public.pontos_jornada(jornada_id, recorded_at);
create index if not exists pontos_jornada_profile_idx on public.pontos_jornada(profile_id);

alter table public.pontos_jornada enable row level security;
drop policy if exists "pontos_jornada_all_own" on public.pontos_jornada;
create policy "pontos_jornada_all_own" on public.pontos_jornada for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- ============================================================================
-- TABELA: ranking_soma (público para leitura, escrita só do dono)
-- ============================================================================
create table if not exists public.ranking_soma (
  profile_id uuid primary key references public.perfil(id) on delete cascade,
  nome_publico text,
  categoria text,
  cidade text,
  uf text,
  ganho_bruto numeric not null default 0,
  ganho_liquido numeric not null default 0,
  ganho_por_hora numeric not null default 0,
  ganho_por_km numeric not null default 0,
  horas_trabalhadas numeric not null default 0,
  km_percorrido numeric not null default 0,
  tipo_carro text,
  tipo_tracao text,
  periodo_inicio date,
  periodo_fim date,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists ranking_soma_uf_idx on public.ranking_soma(uf);
create index if not exists ranking_soma_cidade_idx on public.ranking_soma(cidade);

alter table public.ranking_soma enable row level security;
drop policy if exists "ranking_soma_select_all" on public.ranking_soma;
drop policy if exists "ranking_soma_upsert_own" on public.ranking_soma;
drop policy if exists "ranking_soma_update_own" on public.ranking_soma;
drop policy if exists "ranking_soma_delete_own" on public.ranking_soma;
create policy "ranking_soma_select_all" on public.ranking_soma for select using (true);
create policy "ranking_soma_upsert_own" on public.ranking_soma for insert with check (auth.uid() = profile_id);
create policy "ranking_soma_update_own" on public.ranking_soma for update using (auth.uid() = profile_id);
create policy "ranking_soma_delete_own" on public.ranking_soma for delete using (auth.uid() = profile_id);

-- ============================================================================
-- ALTERAÇÕES adicionais (idempotentes)
-- ============================================================================
alter table public.perfil add column if not exists foto_url text;
alter table public.perfil add column if not exists tipo_propriedade text;
alter table public.perfil add column if not exists tipo_tracao text;

alter table public.veiculo add column if not exists depreciacao_percentual numeric;
alter table public.veiculo add column if not exists dia_vencimento_seguro integer;

alter table public.despesas add column if not exists categoria_personalizada text;

alter table public.ranking_soma add column if not exists foto_url text;
alter table public.ranking_soma add column if not exists tipo_propriedade text;

-- Bucket público para fotos de avatar (ranking)
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_select_all" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;

create policy "avatars_select_all" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name,'/',1));
create policy "avatars_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = split_part(name,'/',1));
create policy "avatars_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = split_part(name,'/',1));

-- ============================================================================
-- Nota: perfil é criado pelo app (auth-service.ts + profileService.ensureExists)
-- imediatamente após o signup/login. Trigger de DB foi removido para evitar
-- conflitos de RLS (auth.uid() = NULL em contexto de trigger).
-- ============================================================================
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;

-- ============================================================================
-- Trigger: updated_at automático
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'perfil','veiculo','jornadas','ganhos','despesas','abastecimentos',
    'plataformas','manutencoes','configuracoes_usuario','despesas_fixas',
    'conferencias_hodometro','assinaturas','ipva_aliquotas','ranking_soma'
  ]) loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end$$;
