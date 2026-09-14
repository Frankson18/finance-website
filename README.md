# Fluxo — finanças pessoais

Monorepo com o app web (Next.js) e a API (Fastify + Prisma + PostgreSQL).

```
finance-website/
├─ apps/web         # Next.js (interface)
├─ apps/api         # Fastify + Prisma (backend)
└─ packages/shared  # tipos e validação (Zod) compartilhados
```

## Pré-requisitos
- Node.js 20+
- Docker (para o PostgreSQL) — ou um Postgres próprio

## Como rodar (dev)

1. Instale as dependências na raiz:
   ```bash
   npm install
   ```
2. Suba o banco e aplique as migrations:
   ```bash
   npm run db:up       # sobe o Postgres no Docker
   npm run db:deploy   # aplica as migrations
   ```
3. Configure o `.env` da API (já existe um `.env` de exemplo):
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
4. Em dois terminais:
   ```bash
   npm run api   # API em http://localhost:3333
   npm run dev   # Web em http://localhost:3000
   ```

Abra `http://localhost:3000` e crie sua conta.

## Login com Google (opcional)
Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `apps/api/.env`.
No Google Cloud Console, cadastre a URI de redirecionamento:
```
http://localhost:3333/api/auth/google/callback
```

## Scripts úteis
- `npm run db:studio` — abre o Prisma Studio
- `npm run build` — build do web
- `npm run typecheck -w @fluxo/web` / `-w @fluxo/api`

## Variáveis
- Web: `NEXT_PUBLIC_API_URL` (padrão `http://localhost:3333`)
- API: veja `apps/api/.env.example`
