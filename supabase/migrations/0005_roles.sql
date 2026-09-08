-- =====================================================================
-- Phase 6 — 役職運用（任命・歴代）
-- 0004 の後に実行。権限判定はすべて DB 側で強制。
-- =====================================================================

create or replace function current_fiscal_year()
returns int language sql stable set search_path = public as $$
  select case when extract(month from now()) >= 4
              then extract(year from now())::int
              else extract(year from now())::int - 1 end;
$$;

-- お世話係を任命（会長 or オーナー）
create or replace function assign_staff(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president')) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from roles where profile_id = p_target and role = 'staff' and end_date is null) then
    insert into roles(profile_id, role, year, start_date, appointed_by)
    values (p_target, 'staff', current_fiscal_year(), current_date, auth.uid());
  end if;
end; $$;

-- お世話係を解除（会長 or オーナー）
create or replace function remove_staff(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president')) then
    raise exception 'forbidden';
  end if;
  update roles set end_date = current_date
  where profile_id = p_target and role = 'staff' and end_date is null;
end; $$;

-- 会長を変更／指名（現会長 or オーナー）。現会長は終了し、新会長を登録。
create or replace function set_president(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president')) then
    raise exception 'forbidden';
  end if;
  update roles set end_date = current_date where role = 'president' and end_date is null;
  insert into roles(profile_id, role, year, start_date, appointed_by)
  values (p_target, 'president', current_fiscal_year(), current_date, auth.uid());
end; $$;

-- サイトオーナーを追加（オーナーのみ）。オーナーは永久保持。
create or replace function set_owner(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role(auth.uid(),'site_owner') then raise exception 'forbidden'; end if;
  if not exists (select 1 from roles where profile_id = p_target and role = 'site_owner' and end_date is null) then
    insert into roles(profile_id, role, year, start_date, appointed_by)
    values (p_target, 'site_owner', current_fiscal_year(), current_date, auth.uid());
  end if;
end; $$;

-- 歴代役職（会長・お世話係）を氏名付きで返す。会員が閲覧できる。
create or replace function get_role_history()
returns table(profile_id uuid, full_name text, role role_type, year int, start_date date, end_date date)
language sql security definer stable set search_path = public as $$
  select r.profile_id, p.full_name, r.role, r.year, r.start_date, r.end_date
  from roles r join profiles p on p.id = r.profile_id
  where r.role in ('president','staff') and auth.uid() is not null
  order by r.year desc,
           case r.role when 'president' then 0 else 1 end,
           p.full_name;
$$;
