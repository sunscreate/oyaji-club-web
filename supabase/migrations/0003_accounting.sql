-- =====================================================================
-- Phase 4 — 会計（準備買物 / 予算 / 立替 / 当日受付 / 当日会計 / ゲスト）
-- 0002 の後に実行。会計系はすべて お世話係(職員)のみアクセス可。
-- =====================================================================

-- 準備・買い物
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  qty text,
  planned_cost int default 0,
  assignee text,
  store text,
  note text,
  status text not null default 'todo',   -- todo / planned / bought / ready
  created_at timestamptz default now()
);
create index if not exists shopping_event_idx on shopping_items(event_id);

-- イベント予算
create table if not exists budgets (
  event_id uuid primary key references events(id) on delete cascade,
  budget_amount int not null default 0
);

-- レシート・立替
create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  item_name text not null,
  amount int not null default 0,
  purchaser text not null,
  image_path text,                       -- receipts バケット内のパス
  settled boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create index if not exists receipts_event_idx on receipts(event_id);

-- 当日受付 & 当日会計（1世帯1行）
create table if not exists day_records (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  guest_id uuid,                         -- ゲスト参加の場合
  received boolean not null default false,     -- 受付済み
  received_at timestamptz,
  amount_normal int default 0,           -- 通常金額(自動)
  amount_actual int,                     -- 今回の受取金額(変更可)
  change_reason text,                    -- 金額変更理由
  paid boolean not null default false,   -- 受取済み(会計)
  paid_at timestamptz,
  created_at timestamptz default now()
);
create unique index if not exists day_records_hh_idx on day_records(event_id, household_id) where household_id is not null;
create index if not exists day_records_event_idx on day_records(event_id);

-- 当日飛び入り（ゲスト）
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  adults int not null default 0,
  children int not null default 0,
  created_at timestamptz default now()
);

-- ---- RLS（すべて職員のみ） -----------------------------------------
alter table shopping_items enable row level security;
alter table budgets        enable row level security;
alter table receipts       enable row level security;
alter table day_records    enable row level security;
alter table guests         enable row level security;

drop policy if exists shopping_staff on shopping_items;
create policy shopping_staff on shopping_items for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists budgets_staff on budgets;
create policy budgets_staff on budgets for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists receipts_staff on receipts;
create policy receipts_staff on receipts for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists day_records_staff on day_records;
create policy day_records_staff on day_records for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists guests_staff on guests;
create policy guests_staff on guests for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ---- レシート画像用 Private バケット（職員のみ） -------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts read" on storage.objects;
create policy "receipts read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_staff(auth.uid()));

drop policy if exists "receipts insert" on storage.objects;
create policy "receipts insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_staff(auth.uid()));

drop policy if exists "receipts delete" on storage.objects;
create policy "receipts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_staff(auth.uid()));
