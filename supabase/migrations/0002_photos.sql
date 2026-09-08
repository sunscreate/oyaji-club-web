-- =====================================================================
-- Phase 2 — 写真機能（photos テーブル / Private Storage / ポリシー）
-- Supabase SQL Editor で 0001 の後に実行する。
-- =====================================================================

-- ---- photos テーブル ----------------------------------------------
create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  storage_path text not null,     -- 本画像 (event-photos バケット内のパス)
  thumb_path text not null,       -- サムネイル
  uploaded_by uuid references profiles(id) on delete set null,
  taken_at timestamptz,           -- 撮影日(なければアップロード日)
  created_at timestamptz default now()
);
create index if not exists photos_event_idx on photos (event_id, taken_at desc);

alter table photos enable row level security;

-- 会員(認証済)は閲覧可
drop policy if exists photos_select on photos;
create policy photos_select on photos for select to authenticated using (true);

-- 追加は本人としてのみ
drop policy if exists photos_insert on photos;
create policy photos_insert on photos for insert to authenticated
  with check (uploaded_by = auth.uid());

-- 削除は「自分がアップした写真」または 職員(オーナー/会長/お世話係)
drop policy if exists photos_delete on photos;
create policy photos_delete on photos for delete to authenticated
  using (uploaded_by = auth.uid() or is_staff(auth.uid()));

-- ---- Private Storage バケット --------------------------------------
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', false)
on conflict (id) do nothing;

-- 会員のみ閲覧(署名付きURL発行に必要)。一般公開・検索エンジン非公開。
drop policy if exists "event photos read" on storage.objects;
create policy "event photos read" on storage.objects for select to authenticated
  using (bucket_id = 'event-photos');

-- 会員はアップロード可
drop policy if exists "event photos insert" on storage.objects;
create policy "event photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos');

-- 削除は 本人がアップしたオブジェクト または 職員
drop policy if exists "event photos delete" on storage.objects;
create policy "event photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and (owner = auth.uid() or public.is_staff(auth.uid())));
