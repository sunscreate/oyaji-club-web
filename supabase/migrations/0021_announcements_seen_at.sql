-- お知らせの既読時刻（アプリアイコンの未読バッジ用）。DB適用済み(2026-11-07)
alter table profile_notification_reads
  add column if not exists announcements_seen_at timestamptz;
