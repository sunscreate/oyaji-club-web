-- =====================================================================
-- さぎぬま幼稚園 おやじ倶楽部 Web — Phase 1 スキーマ / RLS / 関数
-- Supabase SQL Editor に貼り付けて実行する。
-- 権限はすべて DB 側(RLS)で強制する。クライアントの表示制御は補助のみ。
-- =====================================================================

-- ---- 型 -------------------------------------------------------------
do $$ begin
  create type member_type as enum ('current','ob');            -- 在園 / OB
exception when duplicate_object then null; end $$;

do $$ begin
  create type role_type as enum ('site_owner','president','staff','member');
exception when duplicate_object then null; end $$;

-- ---- テーブル -------------------------------------------------------

-- サイト全体設定（園コードなど）。クライアントからは直接読めない。
create table if not exists app_config (
  id int primary key default 1,
  signup_code text not null default '',
  check (id = 1)
);
insert into app_config (id, signup_code) values (1, '') on conflict do nothing;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid,
  created_at timestamptz default now()
);

-- 招待コードは households と分離し、同一世帯のみ閲覧可能にする。
create table if not exists household_invites (
  household_id uuid primary key references households(id) on delete cascade,
  invite_code text unique,
  updated_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  household_id uuid references households(id) on delete set null,
  member_type member_type not null default 'current',
  oyaji_member boolean not null default false,
  tshirt_size text,
  created_at timestamptz default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  grade text not null,      -- 年少 / 年中 / 年長
  name text not null,       -- ○○組
  sort_order int default 0
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  full_name text not null,
  class_id uuid references classes(id) on delete set null,
  status member_type not null default 'current',
  grad_year int,
  created_at timestamptz default now()
);

create table if not exists allergies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  target_name text not null,
  content text not null
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  role role_type not null,
  year int,
  start_date date,
  end_date date,
  appointed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  start_time text,
  place text,
  description text,
  image_path text,
  flyer_path text,
  target text not null default 'both',      -- current / ob / both
  attendance_enabled boolean default true,
  fee_type text default 'household',        -- household / per_person
  fee_config jsonb default '{}'::jsonb,
  belongings text,
  rain_info text,
  notes text,
  photos_enabled boolean default true,
  survey_enabled boolean default false,
  is_annual boolean default false,          -- 総会/懇親会/お手伝い等も年間予定に含む
  status text not null default 'draft',     -- draft / published / finished
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists participations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  household_id uuid not null references households(id) on delete cascade,
  join_type text default 'full',            -- full(最初から) / partial(途中から)
  planned_time text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (event_id, household_id)
);

create table if not exists participation_members (
  id uuid primary key default gen_random_uuid(),
  participation_id uuid not null references participations(id) on delete cascade,
  member_kind text not null,                -- adult / child
  profile_id uuid references profiles(id) on delete cascade,
  child_id uuid references children(id) on delete cascade,
  label text
);

-- ---- ヘルパー関数 (SECURITY DEFINER → RLS 再帰を回避) --------------
create or replace function my_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid();
$$;

create or replace function has_role(uid uuid, r role_type)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from roles where profile_id = uid and role = r and end_date is null
  );
$$;

create or replace function is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from roles
    where profile_id = uid and role in ('site_owner','president','staff') and end_date is null
  );
$$;

-- ---- 登録 RPC (園コード検証を DB 側で強制) -------------------------
-- Supabase Auth のユーザー作成自体は防げないが、profiles を作れなければ
-- RLS により一切のデータにアクセスできない。profiles 作成にはこの RPC が必須。
create or replace function register_household(
  p_full_name text, p_member_type member_type, p_household_name text, p_code text
) returns void language plpgsql security definer set search_path = public as $$
declare v_code text; v_hh uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select signup_code into v_code from app_config where id = 1;
  if coalesce(v_code,'') = '' or p_code <> v_code then
    raise exception 'invalid_signup_code';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'already_registered';
  end if;
  insert into households (name, created_by)
    values (coalesce(nullif(trim(p_household_name),''), p_full_name || '家'), auth.uid())
    returning id into v_hh;
  insert into profiles (id, full_name, household_id, member_type)
    values (auth.uid(), p_full_name, v_hh, p_member_type);
end; $$;

-- 招待コードで既存世帯に参加（園コード不要。既存メンバーの招待が根拠）
create or replace function join_household(
  p_full_name text, p_member_type member_type, p_invite text
) returns void language plpgsql security definer set search_path = public as $$
declare v_hh uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select household_id into v_hh from household_invites where invite_code = upper(trim(p_invite));
  if v_hh is null then raise exception 'invalid_invite'; end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'already_registered';
  end if;
  insert into profiles (id, full_name, household_id, member_type)
    values (auth.uid(), p_full_name, v_hh, p_member_type);
end; $$;

-- 招待コード再発行（押すたびに新規発行＝旧コード無効化）
create or replace function rotate_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare v_hh uuid; v_code text;
begin
  v_hh := my_household_id();
  if v_hh is null then raise exception 'no_household'; end if;
  v_code := upper(
    substr(replace(gen_random_uuid()::text,'-',''),1,4) || '-' ||
    substr(replace(gen_random_uuid()::text,'-',''),1,4)
  );
  insert into household_invites (household_id, invite_code, updated_at)
    values (v_hh, v_code, now())
    on conflict (household_id) do update set invite_code = excluded.invite_code, updated_at = now();
  return v_code;
end; $$;

create or replace function get_my_invite_code()
returns text language sql stable security definer set search_path = public as $$
  select invite_code from household_invites where household_id = my_household_id();
$$;

-- =====================================================================
-- RLS 有効化 & ポリシー
-- =====================================================================
alter table app_config            enable row level security;
alter table households             enable row level security;
alter table household_invites      enable row level security;
alter table profiles              enable row level security;
alter table classes               enable row level security;
alter table children              enable row level security;
alter table allergies             enable row level security;
alter table roles                 enable row level security;
alter table events                enable row level security;
alter table participations        enable row level security;
alter table participation_members enable row level security;

-- app_config: オーナーのみ
create policy app_config_owner on app_config for all to authenticated
  using (has_role(auth.uid(),'site_owner')) with check (has_role(auth.uid(),'site_owner'));

-- households: 認証済は名前を閲覧可（参加世帯一覧のため）。作成/更新は本人世帯 or 職員
create policy households_select on households for select to authenticated using (true);
create policy households_update on households for update to authenticated
  using (id = my_household_id() or is_staff(auth.uid()));

-- household_invites: 同一世帯のみ（招待コードの秘匿）
create policy invites_select on household_invites for select to authenticated
  using (household_id = my_household_id());

-- profiles: 本人 / 同一世帯 / 職員。更新は本人のみ
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or household_id = my_household_id() or is_staff(auth.uid()));
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- classes: 認証済は閲覧可。編集は職員
create policy classes_select on classes for select to authenticated using (true);
create policy classes_write on classes for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- children: 認証済は閲覧可（参加世帯一覧で氏名・クラス表示）。編集は本人世帯 or 職員
create policy children_select on children for select to authenticated using (true);
create policy children_write on children for all to authenticated
  using (household_id = my_household_id() or is_staff(auth.uid()))
  with check (household_id = my_household_id() or is_staff(auth.uid()));

-- allergies: 同一世帯 or 職員のみ（機微情報）
create policy allergies_rw on allergies for all to authenticated
  using (household_id = my_household_id() or is_staff(auth.uid()))
  with check (household_id = my_household_id() or is_staff(auth.uid()));

-- roles: 認証済は閲覧可（バッジ/歴代）。付与はオーナー or 会長
create policy roles_select on roles for select to authenticated using (true);
create policy roles_write on roles for all to authenticated
  using (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president'))
  with check (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president'));

-- events: 公開/終了は全員、下書きは職員のみ。編集は職員
create policy events_select on events for select to authenticated
  using (status in ('published','finished') or is_staff(auth.uid()));
create policy events_write on events for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- participations: 認証済は閲覧可（人数/世帯一覧）。編集は本人世帯
create policy part_select on participations for select to authenticated using (true);
create policy part_write on participations for all to authenticated
  using (household_id = my_household_id() or is_staff(auth.uid()))
  with check (household_id = my_household_id() or is_staff(auth.uid()));

-- participation_members: 認証済は閲覧可。編集は該当参加が本人世帯
create policy pm_select on participation_members for select to authenticated using (true);
create policy pm_write on participation_members for all to authenticated
  using (exists (select 1 from participations p
           where p.id = participation_id
             and (p.household_id = my_household_id() or is_staff(auth.uid()))))
  with check (exists (select 1 from participations p
           where p.id = participation_id
             and (p.household_id = my_household_id() or is_staff(auth.uid()))));
