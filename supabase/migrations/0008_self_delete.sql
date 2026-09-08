-- =====================================================================
-- Phase 8.1 — 自分のアカウント削除（マイページ）
-- 0007 の後に実行。
-- auth.users を削除すると profiles 以下 FK cascade で全関連データが消える。
-- =====================================================================
create or replace function delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;
