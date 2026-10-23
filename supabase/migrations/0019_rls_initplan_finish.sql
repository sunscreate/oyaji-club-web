-- =====================================================================
-- 0019 0018の仕上げ
--  helper関数に渡す auth.uid() も (select auth.uid()) で包み、
--  RLS initplan 警告を完全に解消する。権限ロジックは不変。
--  本番DBへは Supabase MCP (apply_migration) で適用済み（2026-10-23）。
-- =====================================================================
alter policy allergies_rw on allergies
  using (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))))
  with check (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))));
alter policy ann_write on announcements
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy app_config_owner on app_config
  using ((select has_role((select auth.uid()), 'site_owner'::role_type)))
  with check ((select has_role((select auth.uid()), 'site_owner'::role_type)));
alter policy budgets_staff on budgets
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy children_write on children
  using (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))))
  with check (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))));
alter policy classes_write on classes
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy day_records_staff on day_records
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy events_delete on events
  using (((select has_role((select auth.uid()), 'site_owner'::role_type)) or (select has_role((select auth.uid()), 'president'::role_type))));
alter policy events_insert on events
  with check ((select is_staff((select auth.uid()))));
alter policy events_select on events
  using (((status = any (array['published'::text, 'finished'::text])) or (select is_staff((select auth.uid())))));
alter policy events_update on events
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy fb_delete on feedback
  using ((select is_staff((select auth.uid()))));
alter policy fb_update on feedback
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy fbm_delete on feedback_messages
  using ((select is_staff((select auth.uid()))));
alter policy guests_staff on guests
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy households_update on households
  using (((id = (select my_household_id())) or (select is_staff((select auth.uid())))));
alter policy pm_write on participation_members
  using ((exists ( select 1 from participations p where ((p.id = participation_members.participation_id) and ((p.household_id = (select my_household_id())) or (select is_staff((select auth.uid()))))))))
  with check ((exists ( select 1 from participations p where ((p.id = participation_members.participation_id) and ((p.household_id = (select my_household_id())) or (select is_staff((select auth.uid()))))))));
alter policy part_write on participations
  using (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))))
  with check (((household_id = (select my_household_id())) or (select is_staff((select auth.uid())))));
alter policy receipts_staff on receipts
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy roles_write on roles
  using (((select has_role((select auth.uid()), 'site_owner'::role_type)) or (select has_role((select auth.uid()), 'president'::role_type))))
  with check (((select has_role((select auth.uid()), 'site_owner'::role_type)) or (select has_role((select auth.uid()), 'president'::role_type))));
alter policy shopping_staff on shopping_items
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
alter policy sq_write on survey_questions
  using ((select is_staff((select auth.uid())))) with check ((select is_staff((select auth.uid()))));
