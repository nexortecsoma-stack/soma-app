-- =============================================================================
-- SOMA — Adiciona colunas faltantes em todas as tabelas
-- Execute no SQL Editor do Supabase (supabase.com → SQL Editor → New query)
-- Todas as instruções são idempotentes (ADD COLUMN IF NOT EXISTS)
-- =============================================================================

-- jornadas
alter table public.jornadas add column if not exists tempo_total_minutos integer default 0;

-- ganhos
alter table public.ganhos add column if not exists plataforma_id uuid references public.plataformas(id) on delete set null;
alter table public.ganhos add column if not exists observacao text;

-- plataformas
alter table public.plataformas add column if not exists fixa boolean not null default false;
alter table public.plataformas add column if not exists tipo text default 'outro';

-- despesas
alter table public.despesas add column if not exists jornada_id uuid references public.jornadas(id) on delete set null;

-- abastecimentos
alter table public.abastecimentos add column if not exists tipo_combustivel text default 'gasolina';
alter table public.abastecimentos add column if not exists uso text default 'trabalho';
alter table public.abastecimentos add column if not exists observacao text;
alter table public.abastecimentos add column if not exists veiculo_id uuid references public.veiculo(id) on delete set null;
alter table public.abastecimentos add column if not exists consumo_kwh numeric;
alter table public.abastecimentos add column if not exists valor_kwh numeric;
alter table public.abastecimentos add column if not exists autonomia_km_litro numeric;

-- manutencoes (todas as colunas já existem — nenhuma alteração necessária)

-- perfil — preferências e configurações
alter table public.perfil add column if not exists meta_mensal numeric default 10000;
alter table public.perfil add column if not exists dias_folga_semana integer default 2;
alter table public.perfil add column if not exists considerar_ipva_automatico boolean not null default true;
alter table public.perfil add column if not exists considerar_seguro_automatico boolean not null default true;
alter table public.perfil add column if not exists considerar_depreciacao_automatico boolean not null default true;
alter table public.perfil add column if not exists considerar_internet_automatico boolean not null default false;
alter table public.perfil add column if not exists valor_internet_mensal numeric default 80;
alter table public.perfil add column if not exists considerar_manutencoes_basicas boolean not null default false;
alter table public.perfil add column if not exists considerar_custo_soma_automatico boolean not null default false;
alter table public.perfil add column if not exists participar_ranking_soma boolean not null default false;
alter table public.perfil add column if not exists mostrar_ganhos_liquidos_brutos boolean not null default true;
