-- =====================================================================
-- Phase 8.3 — 終了時間とオーナー自動付与トリガー
-- 0009 の後に実行。
-- =====================================================================

alter table events add column if not exists end_time text;

drop trigger if exists trg_grant_owner_on_signup on profiles;
create trigger trg_grant_owner_on_signup
after insert on profiles
for each row execute function grant_owner_on_signup();
