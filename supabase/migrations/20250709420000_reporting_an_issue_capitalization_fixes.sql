-- Reporting an Issue — sentence-case capitalization fixes.

update public.cells
set content = 'PLUS tutor supervisor team evaluates concern and reaches out as needed.'
where id = 'a0000000-0000-4000-8000-0000001d0104';

update public.cells
set content = 'PLUS supervisor team is able to resolve concern.'
where id = 'a0000000-0000-4000-8000-0000001d0207';

update public.cells
set content = 'If needed, PLUS staff might request assistance.'
where id = 'a0000000-0000-4000-8000-0000001d0304';

update public.cells
set links = jsonb_set(
  links,
  '{1,description}',
  to_jsonb('The tutor might receive email from PLUS staff following up on the reported issue.'::text),
  false
)
where id = 'a0000000-0000-4000-8000-0000001d0406';

update public.cells
set links = jsonb_set(
  links,
  '{2,description}',
  to_jsonb('PLUS staff might request for tutor to join a Zoom meeting to discuss the reported issue.'::text),
  false
)
where id = 'a0000000-0000-4000-8000-0000001d0406';
