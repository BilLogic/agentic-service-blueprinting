-- Warm-Up Happy Path step 8 / Alternate Path step 7 — Leave breakout Zoom/Pencil description

update public.cells
set description = 'The tutor leaves the breakout room on Zoom/Pencil once the warm-up activities are complete.'
where id in (
  'a0000000-0000-4000-8000-000000040806',
  'a0000000-0000-4000-8000-000000060806'
);
