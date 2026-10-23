-- =====================================================================
-- 0018 パフォーマンス改善
--  (A) FK未インデックス21件にカバリングインデックスを追加
--  (B) RLSポリシー内の auth.uid()/helper を (select ...) で包み、
--      行ごとの再評価(initplan)を解消
-- 権限ロジックは不変（式を等価なスカラサブクエリに置換するのみ）。
-- 本番DBへは Supabase MCP (apply_migration) で適用済み（2026-10-23）。
-- =====================================================================

-- (A) FK covering indexes ------------------------------------------------
create index if not exists idx_allergies_household        on allergies(household_id);
create index if not exists idx_announcements_created_by   on announcements(created_by);
create index if not exists idx_children_class             on children(class_id);
create index if not exists idx_children_household         on children(household_id);
create index if not exists idx_day_records_household      on day_records(household_id);
create index if not exists idx_events_created_by          on events(created_by);
create index if not exists idx_feedback_profile           on feedback(profile_id);
create index if not exists idx_fbm_feedback               on feedback_messages(feedback_id);
create index if not exists idx_fbm_sender                 on feedback_messages(sender_profile_id);
create index if not exists idx_guests_event               on guests(event_id);
create index if not exists idx_pm_child                   on participation_members(child_id);
create index if not exists idx_pm_participation           on participation_members(participation_id);
create index if not exists idx_pm_profile                 on participation_members(profile_id);
create index if not exists idx_participations_created_by  on participations(created_by);
create index if not exists idx_participations_household   on participations(household_id);
create index if not exists idx_photos_uploaded_by         on photos(uploaded_by);
create index if not exists idx_profiles_household         on profiles(household_id);
create index if not exists idx_receipts_created_by        on receipts(created_by);
create index if not exists idx_roles_appointed_by         on roles(appointed_by);
create index if not exists idx_roles_profile              on roles(profile_id);
create index if not exists idx_sr_profile                 on survey_responses(profile_id);

-- (B) RLS initplan: wrap auth calls in scalar subqueries ----------------
alter policy allergies_rw on allergies
  using (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))))
  with check (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))));
alter policy ann_write on announcements
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy app_config_owner on app_config
  using ((select has_role(auth.uid(), 'site_owner'::role_type)))
  with check ((select has_role(auth.uid(), 'site_owner'::role_type)));
alter policy budgets_staff on budgets
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy children_write on children
  using (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))))
  with check (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))));
alter policy classes_write on classes
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy day_records_staff on day_records
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy events_delete on events
  using (((select has_role(auth.uid(), 'site_owner'::role_type)) or (select has_role(auth.uid(), 'president'::role_type))));
alter policy events_insert on events
  with check ((select is_staff(auth.uid())));
alter policy events_select on events
  using (((status = any (array['published'::text, 'finished'::text])) or (select is_staff(auth.uid()))));
alter policy events_update on events
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy fb_delete on feedback
  using ((select is_staff(auth.uid())));
alter policy fb_insert on feedback
  with check ((profile_id = (select auth.uid())));
alter policy fb_select on feedback
  using ((is_published or (profile_id = (select auth.uid())) or (select is_staff(auth.uid()))));
alter policy fb_update on feedback
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy fbm_delete on feedback_messages
  using ((select is_staff(auth.uid())));
alter policy fbm_insert on feedback_messages
  with check (((sender_profile_id = (select auth.uid())) and (exists ( select 1 from feedback f where ((f.id = feedback_messages.feedback_id) and (((feedback_messages.sender_role = 'user'::text) and (f.profile_id = (select auth.uid()))) or ((feedback_messages.sender_role = 'staff'::text) and (select is_staff(auth.uid())))))))));
alter policy fbm_select on feedback_messages
  using ((exists ( select 1 from feedback f where ((f.id = feedback_messages.feedback_id) and ((f.profile_id = (select auth.uid())) or (select is_staff(auth.uid())))))));
alter policy guests_staff on guests
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy invites_select on household_invites
  using ((household_id = (select my_household_id())));
alter policy households_update on households
  using (((id = (select my_household_id())) or (select is_staff(auth.uid()))));
alter policy pm_write on participation_members
  using ((exists ( select 1 from participations p where ((p.id = participation_members.participation_id) and ((p.household_id = (select my_household_id())) or (select is_staff(auth.uid())))))))
  with check ((exists ( select 1 from participations p where ((p.id = participation_members.participation_id) and ((p.household_id = (select my_household_id())) or (select is_staff(auth.uid())))))));
alter policy part_write on participations
  using (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))))
  with check (((household_id = (select my_household_id())) or (select is_staff(auth.uid()))));
alter policy photos_delete on photos
  using (((uploaded_by = (select auth.uid())) or (select is_staff(auth.uid()))));
alter policy photos_insert on photos
  with check ((uploaded_by = (select auth.uid())));
alter policy pnr_insert on profile_notification_reads
  with check ((profile_id = (select auth.uid())));
alter policy pnr_select on profile_notification_reads
  using ((profile_id = (select auth.uid())));
alter policy pnr_update on profile_notification_reads
  using ((profile_id = (select auth.uid()))) with check ((profile_id = (select auth.uid())));
alter policy profiles_select on profiles
  using (((id = (select auth.uid())) or (household_id = (select my_household_id())) or (select is_staff(auth.uid()))));
alter policy profiles_update on profiles
  using ((id = (select auth.uid()))) with check ((id = (select auth.uid())));
alter policy receipts_staff on receipts
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy roles_write on roles
  using (((select has_role(auth.uid(), 'site_owner'::role_type)) or (select has_role(auth.uid(), 'president'::role_type))))
  with check (((select has_role(auth.uid(), 'site_owner'::role_type)) or (select has_role(auth.uid(), 'president'::role_type))));
alter policy shopping_staff on shopping_items
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy sq_write on survey_questions
  using ((select is_staff(auth.uid()))) with check ((select is_staff(auth.uid())));
alter policy sr_delete on survey_responses
  using ((profile_id = (select auth.uid())));
alter policy sr_insert on survey_responses
  with check ((profile_id = (select auth.uid())));
alter policy sr_select on survey_responses
  using (((profile_id = (select auth.uid())) or (select is_staff(auth.uid()))));
alter policy sr_update on survey_responses
  using ((profile_id = (select auth.uid()))) with check ((profile_id = (select auth.uid())));
