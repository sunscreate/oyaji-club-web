-- =====================================================================
-- Phase 8.8 — 会長・オーナーによる加盟状態の修正
-- Supabase SQL Editor に貼り付けて実行する。
-- =====================================================================

create or replace function set_oyaji_membership(p_target uuid, p_joined boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(), 'site_owner') or has_role(auth.uid(), 'president')) then
    raise exception 'forbidden';
  end if;

  update profiles
  set
    oyaji_member = coalesce(p_joined, false),
    tshirt_size = null,
    tshirt_delivered = coalesce(p_joined, false)
  where id = p_target;
end $$;
