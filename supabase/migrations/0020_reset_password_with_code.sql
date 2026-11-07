-- パスワード再設定（メール不使用のため、園コードで本人確認して再設定）
-- p_email は氏名から生成した内部メール（クライアントで personNameToEmail 済み）
-- 本番DBへは Supabase MCP (apply_migration) で適用済み（2026-11-07）。
create or replace function public.reset_password_with_code(p_email text, p_code text, p_new_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_id uuid; v_code text;
begin
  if length(coalesce(p_new_password, '')) < 6 then
    return jsonb_build_object('ok', false, 'error', 'password_too_short');
  end if;
  select signup_code into v_code from app_config where id = 1;
  if v_code is null or upper(btrim(p_code)) is distinct from upper(btrim(v_code)) then
    return jsonb_build_object('ok', false, 'error', 'bad_code');
  end if;
  select id into v_id from auth.users where email = lower(btrim(p_email)) limit 1;
  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = v_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;
