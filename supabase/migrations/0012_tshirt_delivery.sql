-- =====================================================================
-- Tシャツ受け渡し管理
-- Supabase SQL Editor に貼り付けて実行する。
-- =====================================================================

alter table profiles
add column if not exists tshirt_delivered boolean not null default false;

create or replace function set_tshirt_delivered(p_target uuid, p_delivered boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff(auth.uid()) then
    raise exception 'forbidden';
  end if;

  update profiles
  set tshirt_delivered = coalesce(p_delivered, false)
  where id = p_target
    and oyaji_member = true;
end $$;
