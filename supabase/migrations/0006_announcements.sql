-- =====================================================================
-- Phase 7 — お知らせ / 参加人数のリアルタイム更新
-- 0005 の後に実行。
-- =====================================================================

-- お知らせ
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table announcements enable row level security;
drop policy if exists ann_select on announcements;
create policy ann_select on announcements for select to authenticated using (true);
drop policy if exists ann_write on announcements;
create policy ann_write on announcements for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- ---- Realtime（参加人数のライブ更新用） ---------------------------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'participations') then
    alter publication supabase_realtime add table participations;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'participation_members') then
    alter publication supabase_realtime add table participation_members;
  end if;
end $$;
