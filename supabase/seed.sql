-- =====================================================================
-- 初期データ投入 & オーナー設定（Supabase SQL Editor で実行）
-- =====================================================================

-- 1) 園コードを設定（保護者に配布する共有コード。任意の文字列に変更する）
update app_config set signup_code = 'saginuma-2026' where id = 1;

-- 2) 今年度のクラスを登録（例。実際の組名に合わせて編集する）
insert into classes (year, grade, name, sort_order) values
  (2026, '年少', 'もも組',   10),
  (2026, '年少', 'ちゅうりっぷ組', 11),
  (2026, '年中', 'ばら組',   20),
  (2026, '年中', 'すみれ組', 21),
  (2026, '年長', 'さくら組', 30),
  (2026, '年長', 'ひまわり組', 31)
on conflict do nothing;

-- 3) サイトオーナーの設定
--    先に本人がサイトから「新規登録（園コード入力）」を済ませてから、
--    手動付与が必要な場合だけ、下記の <YOUR_EMAIL> を Supabase Auth の内部メールに変えて実行する。
--    以後オーナー権限は永久保持（会長職とは独立）。
insert into roles (profile_id, role, year, start_date)
select p.id, 'site_owner', 2026, current_date
from profiles p
join auth.users u on u.id = p.id
where u.email = '<YOUR_EMAIL>'
on conflict do nothing;

-- （任意）初代会長も設定する場合
-- insert into roles (profile_id, role, year, start_date)
-- select p.id, 'president', 2026, current_date
-- from profiles p join auth.users u on u.id = p.id
-- where u.email = '<PRESIDENT_EMAIL>';
