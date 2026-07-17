-- Before Students Join — sentence-case capitalization + trailing periods.

update public.cells
set content = 'Turn on the projector or interactive whiteboard.'
where id = 'a0000000-0000-4000-8000-000000180101';

update public.cells
set content = 'Open slide deck shared by the tutor team.'
where id = 'a0000000-0000-4000-8000-000000180201';

update public.cells
set content = 'Post Zoom link in LMS or share the QR code depending on session needs.'
where id = 'a0000000-0000-4000-8000-000000180301';

update public.cells
set content = 'Test the wifi.'
where id = 'a0000000-0000-4000-8000-000000180401';

update public.cells
set content = 'Make sure all student devices are ready.'
where id = 'a0000000-0000-4000-8000-000000180501';

update public.cells
set content = 'Remind students to plug in their headphones and use their real names on Zoom.'
where id = 'a0000000-0000-4000-8000-000000180601';

update public.cells
set content = 'Open session detail page.'
where id = 'a0000000-0000-4000-8000-000000180102';

update public.cells
set content = 'Joins Zoom/ Pencil session.'
where id = 'a0000000-0000-4000-8000-000000180202';

update public.cells
set content = 'Take tutor attendance.'
where id = 'a0000000-0000-4000-8000-000000180302';

update public.cells
set content = 'Create breakout rooms.'
where id = 'a0000000-0000-4000-8000-000000180402';

update public.cells
set content = 'Remind tutors to go through rooms in order of dashboard list.'
where id = 'a0000000-0000-4000-8000-000000180502';

update public.cells
set content = 'Give breakout room list to the tutors.'
where id = 'a0000000-0000-4000-8000-000000180602';

update public.cells
set content = 'Tutor open session detail page.'
where id = 'a0000000-0000-4000-8000-000000180103';

update public.cells
set content = 'Joins Zoom session.'
where id = 'a0000000-0000-4000-8000-000000180203';

update public.cells
set content = 'Sign in with lead tutor and confirms they have co-host permissions.'
where id = 'a0000000-0000-4000-8000-000000180303';

update public.cells
set content = 'Review student list for session.'
where id = 'a0000000-0000-4000-8000-000000180503';

update public.cells
set content = 'Receive breakout rooms from lead tutor.'
where id = 'a0000000-0000-4000-8000-000000180603';

update public.cells
set content = 'Tutor supervisor team sets up session details.'
where id = 'a0000000-0000-4000-8000-000000180107';

update public.cells
set content = 'Tutor supervisor team sets up Zoom/Pencil link.'
where id = 'a0000000-0000-4000-8000-000000180207';

update public.cells
set content = E'Dev team\nDesign team'
where id in (
  'a0000000-0000-4000-8000-000000180109',
  'a0000000-0000-4000-8000-000000180209',
  'a0000000-0000-4000-8000-000000180509'
);

update public.cells
set description = 'The lead tutor reminds the regular tutor via Zoom/Pencil to go through rooms in order of the dashboard list.'
where id = 'a0000000-0000-4000-8000-000000180506';

update public.cells
set links = jsonb_set(
  links,
  '{0,description}',
  to_jsonb('The tutors open the session detail page in the PLUS app to join the session.'::text),
  false
)
where id = 'a0000000-0000-4000-8000-000000180106';

update public.cells
set links = jsonb_set(
  links,
  '{0,description}',
  to_jsonb('The tutors join the Zoom/Pencil page via the join session modal in the session dashboard.'::text),
  false
)
where id = 'a0000000-0000-4000-8000-000000180206';
