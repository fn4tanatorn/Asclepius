-- Every table in this schema relies on RLS as the actual authorization
-- boundary (see AGENTS.md: "RLS is the security boundary") and was never
-- given its own explicit table-level GRANTs — it worked because Supabase's
-- older platform default auto-exposed new `public` tables to anon/
-- authenticated. That default is deprecated and scheduled for removal
-- (see the `auto_expose_new_tables` comment in supabase/config.toml), and
-- CI's freshly-bootstrapped database already reflects the new default: pgTAP
-- runs failed with "permission denied for table exam_attempts" etc. even
-- though every one of these tables has working RLS policies.
--
-- The linked production project still has the old broad grants (it was
-- provisioned before this default changed), so this is not fixing a live
-- break — it's making the schema self-contained so a freshly bootstrapped
-- database (CI, or any future new environment) works without relying on a
-- platform default that's going away. Idempotent: re-granting an existing
-- privilege is a no-op.

grant select, insert, update, delete on public.profiles            to authenticated;
grant select, insert, update, delete on public.courses             to authenticated;
grant select, insert, update, delete on public.videos              to authenticated;
grant select, insert, update, delete on public.video_progress      to authenticated;
grant select, insert, update, delete on public.exams               to authenticated;
grant select, insert, update, delete on public.questions           to authenticated;
grant select, insert, update, delete on public.choices             to authenticated;
grant select, insert, update, delete on public.exam_attempts       to authenticated;
grant select, insert, update, delete on public.answer_keys         to authenticated;
grant select, insert, update, delete on public.exam_feedback       to authenticated;
grant select, insert, update, delete on public.course_feedback     to authenticated;
grant select, insert, update, delete on public.video_issue_reports to authenticated;

-- attempt_answers already has narrower, explicit column-level insert/update
-- grants (is_correct must stay write-only by submit_exam_attempt()); it was
-- only ever missing select/delete at the table level.
grant select, delete on public.attempt_answers to authenticated;
