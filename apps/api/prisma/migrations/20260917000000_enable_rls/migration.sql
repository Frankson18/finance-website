-- Row Level Security por usuário (defesa em profundidade).
-- A API define `app.user_id` via `set_config('app.user_id', <id>, true)` em cada
-- transação; as políticas abaixo garantem que um usuário nunca veja/altere dados
-- de outro, mesmo em caso de bug na aplicação.

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" FORCE ROW LEVEL SECURITY;
CREATE POLICY "transaction_user_isolation" ON "Transaction"
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

ALTER TABLE "Card" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Card" FORCE ROW LEVEL SECURITY;
CREATE POLICY "card_user_isolation" ON "Card"
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tag_user_isolation" ON "Tag"
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));

ALTER TABLE "Goal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Goal" FORCE ROW LEVEL SECURITY;
CREATE POLICY "goal_user_isolation" ON "Goal"
  USING ("userId" = current_setting('app.user_id', true))
  WITH CHECK ("userId" = current_setting('app.user_id', true));
