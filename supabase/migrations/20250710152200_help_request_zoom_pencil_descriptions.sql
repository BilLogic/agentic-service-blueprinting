-- Help Request Happy Path: Zoom/Pencil descriptions.

update public.cells
set description = 'The tutor connects with student via Zoom/Pencil in individual breakout room.'
where id in (
  'a0000000-0000-4000-8000-0000001b0106',
  'a0000000-0000-4000-8000-0000001b0206',
  'a0000000-0000-4000-8000-0000001b0306',
  'a0000000-0000-4000-8000-0000001b0406'
);

update public.cells
set description = 'The tutor leaves the student''s Zoom/Pencil breakout room.'
where id = 'a0000000-0000-4000-8000-0000001b0506';
