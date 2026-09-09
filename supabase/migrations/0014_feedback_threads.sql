-- =====================================================================
-- Phase 8.5 — ご意見・ご質問をアカウント別のやりとりに拡張
-- feedback を親スレッド、feedback_messages を個別メッセージとして扱う。
-- FAQ公開は従来通り feedback.is_published / reply を使う。
-- =====================================================================

alter table feedback
  add column if not exists profile_id uuid references profiles(id) on delete set null;

create table if not exists feedback_messages (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references feedback(id) on delete cascade,
  sender_profile_id uuid references profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('user', 'staff')),
  body text not null,
  created_at timestamptz default now()
);

alter table feedback_messages enable row level security;

drop policy if exists fb_select on feedback;
create policy fb_select on feedback for select to authenticated
  using (is_published or profile_id = auth.uid() or is_staff(auth.uid()));

drop policy if exists fb_insert on feedback;
create policy fb_insert on feedback for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists fb_update on feedback;
create policy fb_update on feedback for update to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists fbm_select on feedback_messages;
create policy fbm_select on feedback_messages for select to authenticated
  using (
    exists (
      select 1 from feedback f
      where f.id = feedback_messages.feedback_id
        and (f.profile_id = auth.uid() or is_staff(auth.uid()))
    )
  );

drop policy if exists fbm_insert on feedback_messages;
create policy fbm_insert on feedback_messages for insert to authenticated
  with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from feedback f
      where f.id = feedback_messages.feedback_id
        and (
          (feedback_messages.sender_role = 'user' and f.profile_id = auth.uid())
          or (feedback_messages.sender_role = 'staff' and is_staff(auth.uid()))
        )
    )
  );

drop policy if exists fbm_delete on feedback_messages;
create policy fbm_delete on feedback_messages for delete to authenticated
  using (is_staff(auth.uid()));

create or replace function create_initial_feedback_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into feedback_messages(feedback_id, sender_profile_id, sender_role, body, created_at)
    values (new.id, new.profile_id, 'user', new.content, coalesce(new.created_at, now()));
  return new;
end $$;

drop trigger if exists trg_initial_feedback_message on feedback;
create trigger trg_initial_feedback_message
after insert on feedback
for each row execute function create_initial_feedback_message();

insert into feedback_messages(feedback_id, sender_profile_id, sender_role, body, created_at)
select f.id, f.profile_id, 'user', f.content, f.created_at
from feedback f
where not exists (select 1 from feedback_messages m where m.feedback_id = f.id);
