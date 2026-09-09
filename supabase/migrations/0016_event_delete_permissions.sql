-- =====================================================================
-- Phase 8.7 — イベント削除を会長・オーナーのみに制限
-- 作成/編集は従来通りお世話係も可能。削除だけ権限を分ける。
-- =====================================================================

drop policy if exists events_write on events;
drop policy if exists events_insert on events;
drop policy if exists events_update on events;
drop policy if exists events_delete on events;

create policy events_insert on events for insert to authenticated
  with check (is_staff(auth.uid()));

create policy events_update on events for update to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

create policy events_delete on events for delete to authenticated
  using (has_role(auth.uid(), 'site_owner') or has_role(auth.uid(), 'president'));
