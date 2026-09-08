-- =====================================================================
-- Phase 8 — 追加要望（イベント告知メディア/加盟通知/名簿/削除/意見返信/総予算）
-- 0006 の後に実行。
-- =====================================================================

-- ---- profiles: おやじ倶楽部 加盟日時 -------------------------------
alter table profiles add column if not exists oyaji_joined_at timestamptz;

create or replace function set_oyaji_joined() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.oyaji_member and (tg_op = 'INSERT' or not coalesce(old.oyaji_member,false)) then
    new.oyaji_joined_at := now();
  end if;
  if not new.oyaji_member then
    new.oyaji_joined_at := null;
  end if;
  return new;
end $$;
drop trigger if exists trg_oyaji_joined on profiles;
create trigger trg_oyaji_joined before insert or update on profiles
for each row execute function set_oyaji_joined();

-- ---- feedback: 返信 & 公開 -----------------------------------------
alter table feedback add column if not exists reply text;
alter table feedback add column if not exists replied_at timestamptz;
alter table feedback add column if not exists is_published boolean not null default false;

-- 会員は「公開済みの回答」を閲覧可、職員は全件閲覧可
drop policy if exists fb_select on feedback;
create policy fb_select on feedback for select to authenticated
  using (is_published or is_staff(auth.uid()));

-- ---- app_config: おやじ倶楽部 初期資金（総予算の基準額） -----------
alter table app_config add column if not exists club_base_funds int not null default 0;

-- ---- イベント告知メディア（画像/PDF）用 Private バケット ----------
insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', false)
on conflict (id) do nothing;

drop policy if exists "event media read" on storage.objects;
create policy "event media read" on storage.objects for select to authenticated
  using (bucket_id = 'event-media');
drop policy if exists "event media insert" on storage.objects;
create policy "event media insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-media' and public.is_staff(auth.uid()));
drop policy if exists "event media delete" on storage.objects;
create policy "event media delete" on storage.objects for delete to authenticated
  using (bucket_id = 'event-media' and public.is_staff(auth.uid()));

-- events に告知メディアのMIME種別を保持（image / pdf）
alter table events add column if not exists media_kind text;

-- ---- オーナー＆会長 自動付与（本人の初回登録時） ------------------
create or replace function grant_owner_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  select email into v_email from auth.users where id = new.id;
  if lower(v_email) = 'sunscreate528@gmail.com' then
    insert into roles(profile_id, role, year, start_date)
      values (new.id, 'site_owner', current_fiscal_year(), current_date) on conflict do nothing;
    insert into roles(profile_id, role, year, start_date)
      values (new.id, 'president', current_fiscal_year(), current_date) on conflict do nothing;
  end if;
  return new;
end $$;

-- ---- おやじ倶楽部 総予算（現在残高）の集計・設定 -----------------
-- 総予算 = 初期資金 + Σ(当日会計の受取) - Σ(立替=レシート)
create or replace function get_club_funds()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_base int; v_income int; v_expense int;
begin
  if not is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  select coalesce(club_base_funds,0) into v_base from app_config where id = 1;
  select coalesce(sum(coalesce(amount_actual, amount_normal)),0) into v_income from day_records where paid;
  select coalesce(sum(amount),0) into v_expense from receipts;
  return jsonb_build_object('base', v_base, 'income', v_income, 'expense', v_expense, 'total', v_base + v_income - v_expense);
end $$;

create or replace function set_club_base_funds(p_amount int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president')) then
    raise exception 'forbidden';
  end if;
  update app_config set club_base_funds = coalesce(p_amount,0) where id = 1;
end $$;

-- ---- アカウント削除（会長・オーナーのみ） -------------------------
-- auth.users を削除すると profiles 以下 FK cascade で全関連データが消える。
create or replace function admin_delete_account(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (has_role(auth.uid(),'site_owner') or has_role(auth.uid(),'president')) then
    raise exception 'forbidden';
  end if;
  if p_target = auth.uid() then raise exception 'cannot_delete_self'; end if;
  if exists (select 1 from roles where profile_id = p_target and role = 'site_owner' and end_date is null) then
    raise exception 'cannot_delete_owner';
  end if;
  delete from auth.users where id = p_target;
end $$;
