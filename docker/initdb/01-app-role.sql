-- Papel de aplicação sem privilégios de superusuário, para que a Row Level Security
-- seja realmente aplicada. O usuário dono (POSTGRES_USER) roda apenas as migrations.
--
-- Em produção, defina uma senha forte e use a mesma na DATABASE_URL da API.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fluxo_app') THEN
    CREATE ROLE fluxo_app LOGIN PASSWORD 'fluxo_app_pw';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE fluxo TO fluxo_app;
GRANT USAGE ON SCHEMA public TO fluxo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fluxo_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fluxo_app;
