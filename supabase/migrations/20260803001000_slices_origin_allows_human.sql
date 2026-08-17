-- The app's origin vocabulary is three-valued and the constraint predated
-- the third: 'generated' (skill output), 'customized' (skill output edited
-- by hand), 'human' (authored in the app, never the skill's to regenerate).
-- createSlice sends 'human'; the constraint bounced every in-app slice.
-- This never surfaced before because permission denial masked it — the
-- insert failed earlier for sessions without write access.
alter table public.slices drop constraint slices_origin_check;
alter table public.slices add constraint slices_origin_check
  check (origin = any (array['generated'::text, 'customized'::text, 'human'::text]));
