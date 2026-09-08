-- =====================================================================
-- Phase 8.2 — アカウント削除を可能にする FK 調整
-- created_by / appointed_by 参照を「削除時 NULL」に変更（作成者が退会しても
-- イベント等のデータは残す）。これがないと退会/アカウント削除が FK で失敗する。
-- =====================================================================
alter table events drop constraint if exists events_created_by_fkey;
alter table events add constraint events_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table participations drop constraint if exists participations_created_by_fkey;
alter table participations add constraint participations_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table receipts drop constraint if exists receipts_created_by_fkey;
alter table receipts add constraint receipts_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table announcements drop constraint if exists announcements_created_by_fkey;
alter table announcements add constraint announcements_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

alter table roles drop constraint if exists roles_appointed_by_fkey;
alter table roles add constraint roles_appointed_by_fkey
  foreign key (appointed_by) references profiles(id) on delete set null;
