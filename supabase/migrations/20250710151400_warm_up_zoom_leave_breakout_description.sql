-- Warm-Up Happy + Alternate: update Leave breakout room Zoom/Pencil description.

update public.cells
set description = 'The tutor leaves the student''s Zoom/Pencil breakout room.'
where id in (
  'a0000000-0000-4000-8000-000000040806',
  'a0000000-0000-4000-8000-000000060806'
);
