-- =====================================================================
-- Phase 8.6 — ご意見・ご質問のホーム通知
-- アカウントごとに、やりとり/質問回答を最後に見た時刻を保存する。
-- =====================================================================

create table if not exists profile_notification_reads (
  profile_id uuid primary key references profiles(id) on delete cascade,
  feedback_threads_seen_at timestamptz,
  feedback_faq_seen_at timestamptz,
  updated_at timestamptz default now()
);

alter table profile_notification_reads enable row level security;

drop policy if exists pnr_select on profile_notification_reads;
create policy pnr_select on profile_notification_reads for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists pnr_insert on profile_notification_reads;
create policy pnr_insert on profile_notification_reads for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists pnr_update on profile_notification_reads;
create policy pnr_update on profile_notification_reads for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
