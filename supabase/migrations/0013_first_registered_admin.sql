-- =====================================================================
-- Phase 8.4 — 初回登録者を会長・オーナーにする
-- 既存アカウントを全削除して再登録する運用に合わせ、
-- 最初に profiles が作成された1人へ site_owner / president を自動付与する。
-- =====================================================================

create or replace function grant_owner_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1
    from roles
    where role in ('site_owner', 'president')
      and end_date is null
  ) then
    insert into roles(profile_id, role, year, start_date)
      values (new.id, 'site_owner', current_fiscal_year(), current_date)
      on conflict do nothing;
    insert into roles(profile_id, role, year, start_date)
      values (new.id, 'president', current_fiscal_year(), current_date)
      on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists trg_grant_owner_on_signup on profiles;
create trigger trg_grant_owner_on_signup
after insert on profiles
for each row execute function grant_owner_on_signup();
