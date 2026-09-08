-- =====================================================================
-- Phase 5 — アンケート / ご意見・ご質問
-- 0003 の後に実行。
-- =====================================================================

-- アンケート設問（イベントごと）
create table if not exists survey_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  type text not null,                 -- rating5 / single / multi / yesno / text
  text text not null,
  options jsonb not null default '[]'::jsonb,   -- single / multi の選択肢
  sort_order int not null default 0,
  created_at timestamptz default now()
);
create index if not exists sq_event_idx on survey_questions(event_id, sort_order);

-- 回答（設問×ユーザーで1行）
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  question_id uuid not null references survey_questions(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  value jsonb,                        -- 数値 / 文字列 / 文字列配列
  created_at timestamptz default now(),
  unique (question_id, profile_id)
);
create index if not exists sr_event_idx on survey_responses(event_id);

-- ご意見・ご質問
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_anonymous boolean not null default false,
  content text not null,
  status text not null default 'unread',   -- unread / read
  created_at timestamptz default now()
);

-- ---- RLS -----------------------------------------------------------
alter table survey_questions enable row level security;
alter table survey_responses enable row level security;
alter table feedback         enable row level security;

-- 設問：会員は閲覧（回答用）、編集は職員
drop policy if exists sq_select on survey_questions;
create policy sq_select on survey_questions for select to authenticated using (true);
drop policy if exists sq_write on survey_questions;
create policy sq_write on survey_questions for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- 回答：本人は自分の回答を読み書き、職員は集計のため閲覧可
drop policy if exists sr_select on survey_responses;
create policy sr_select on survey_responses for select to authenticated
  using (profile_id = auth.uid() or is_staff(auth.uid()));
drop policy if exists sr_insert on survey_responses;
create policy sr_insert on survey_responses for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists sr_update on survey_responses;
create policy sr_update on survey_responses for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
drop policy if exists sr_delete on survey_responses;
create policy sr_delete on survey_responses for delete to authenticated
  using (profile_id = auth.uid());

-- ご意見：会員は投稿のみ（匿名可）、閲覧・状態更新は職員
drop policy if exists fb_insert on feedback;
create policy fb_insert on feedback for insert to authenticated with check (true);
drop policy if exists fb_select on feedback;
create policy fb_select on feedback for select to authenticated using (is_staff(auth.uid()));
drop policy if exists fb_update on feedback;
create policy fb_update on feedback for update to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
drop policy if exists fb_delete on feedback;
create policy fb_delete on feedback for delete to authenticated using (is_staff(auth.uid()));
