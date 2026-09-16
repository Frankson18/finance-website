# Fluxo — finanças pessoais

Monorepo com o app web (Next.js) e a API (Fastify + Prisma + PostgreSQL).

```
finance-website/
├─ apps/web         # Next.js (interface)
├─ apps/api         # Fastify + Prisma (backend)
├─ packages/shared  # tipos e validação (Zod) compartilhados
└─ ui.pen           # design (Pencil)
```

## Funcionalidades
- **Saldos**: planilha de 12 meses com colunas `dia · entradas · saídas · diários · economias · cartão · saldos`.
  - Coluna de saldo com **cor dinâmica** (vermelho → vermelho suave → verde → verde intenso).
  - Check-in do dia, colunas recolhíveis e meses alinhados (31 linhas).
  - No **mobile**, planilha com **troca de coluna** (padrão: saldos).
- **Lançamentos**: título + descrição, valor com **máscara de dinheiro** (estilo caixa registradora), tags, cartão.
  - Vários lançamentos no mesmo dia (selo `N×`), edição clara e exclusão com confirmação.
  - **Recorrência** diária, semanal ou mensal (com “a cada N”), e **parcelamento** no cartão.
  - Excluir “somente esta” ou “toda a série”.
- **Economias**: página com **metas** (criar/editar/excluir), adicionar valores, total guardado, este mês, média e mês a mês (com acumulado).
- **Horizonte**: projeção do saldo futuro com **economias/guardado** por mês e compromissos futuros.
- **Totais**: KPIs, gráfico entradas × saídas, tabela por mês e taxa de economia.
- **Tags**: CRUD com cores e cruzamento de movimentações.
- **Cartões**: cadastro (limite, fechamento, vencimento, cor), fatura por mês e compras.
- **Conta**: dados do usuário, **sair**, saldo inicial, horizonte e export/import de dados.

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
3. Configure o `.env` da API:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
4. Em dois terminais:
   ```bash
   npm run api   # API em http://localhost:3333
   npm run dev   # Web em http://localhost:3000
   ```

Abra `http://localhost:3000` e crie sua conta. O Next faz **proxy de `/api/*`** para a API (mesma origem), o que mantém os cookies de sessão como primeira parte. Para parar os servidores: `npm run stop`. Para rodar a API sem watch: `npm run api:once`.

## Login com Google (opcional)
Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `apps/api/.env`.
No Google Cloud Console, cadastre a URI de redirecionamento (via proxy do Next):
```
http://localhost:3000/api/auth/google/callback
```
Se o Google não estiver configurado, o botão “Continuar com Google” não aparece.

## Scripts
- `npm run api` / `npm run api:once` — API (com/sem watch)
- `npm run dev` — web
- `npm run build` — build do web
- `npm run stop` — para o que estiver nas portas 3000/3333
- `npm run db:up` / `db:down` / `db:deploy` / `db:studio`
- `npm run typecheck -w @fluxo/web` / `-w @fluxo/api`

## Variáveis
- **Web** (`apps/web/.env`):
  - `API_PROXY_URL` — destino do proxy `/api` → API (padrão `http://localhost:3333`).
  - `NEXT_PUBLIC_API_URL` — opcional; chama a API direto (sem proxy).
  - `NEXT_PUBLIC_CAPTCHA_SITEKEY` — opcional (hCaptcha).
- **API** (`apps/api/.env`) — veja `apps/api/.env.example`:
  - `DATABASE_URL`, `JWT_SECRET`, `PORT`, `API_URL`, `WEB_URL`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (opcional)
  - `PWNED_CHECK` (`true`/`false`) e `CAPTCHA_SECRET` (opcional)

## Segurança
- Sessão por **cookie httpOnly** (`SameSite=Lax`) + **CSRF** (`x-csrf-token`, double-submit).
- Senha: mínimo 8 com letra e número; **verificação de senha vazada** (Have I Been Pwned).
- **Rate limit** por IP e **bloqueio progressivo** por conta após tentativas erradas.
- Cadastro com **resposta genérica** (não revela se o e-mail existe) — por isso, após criar a conta, faça login.
- Login com **tempo constante** (não vaza quais e-mails existem).
- Em produção, `JWT_SECRET` é obrigatório e validado na inicialização; restrinja o CORS à origem do web.
