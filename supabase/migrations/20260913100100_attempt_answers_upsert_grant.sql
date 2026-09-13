-- PostgREST upsert emits ON CONFLICT DO UPDATE SET for every column in the
-- body, including the key columns, so they need the UPDATE privilege too.
-- RLS still limits rows to the caller's own open attempt; is_correct stays
-- writable only by submit_exam_attempt().
grant update (attempt_id, question_id, choice_id, text_answer, answered_at) on public.attempt_answers to authenticated;
