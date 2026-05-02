-- Migração: criação da tabela ranking_soma
-- Execute no Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS ranking_soma (
  profile_id        TEXT PRIMARY KEY,
  nome_publico      TEXT,
  categoria         TEXT,
  cidade            TEXT,
  uf                TEXT,
  ganho_bruto       NUMERIC NOT NULL DEFAULT 0,
  ganho_liquido     NUMERIC NOT NULL DEFAULT 0,
  ganho_por_hora    NUMERIC NOT NULL DEFAULT 0,
  ganho_por_km      NUMERIC NOT NULL DEFAULT 0,
  horas_trabalhadas NUMERIC NOT NULL DEFAULT 0,
  km_percorrido     NUMERIC NOT NULL DEFAULT 0,
  tipo_carro        TEXT,
  tipo_tracao       TEXT,
  tipo_propriedade  TEXT,
  foto_url          TEXT,
  periodo_inicio    DATE,
  periodo_fim       DATE,
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilita Row Level Security
ALTER TABLE ranking_soma ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ler o ranking
CREATE POLICY "ranking_soma_select_public"
  ON ranking_soma FOR SELECT
  USING (true);

-- Só o próprio motorista pode inserir/atualizar/deletar seu registro
CREATE POLICY "ranking_soma_insert_own"
  ON ranking_soma FOR INSERT
  WITH CHECK (profile_id = auth.uid()::text);

CREATE POLICY "ranking_soma_update_own"
  ON ranking_soma FOR UPDATE
  USING (profile_id = auth.uid()::text);

CREATE POLICY "ranking_soma_delete_own"
  ON ranking_soma FOR DELETE
  USING (profile_id = auth.uid()::text);
