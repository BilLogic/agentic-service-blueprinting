-- Warm-Up Happy Path step 6 / Alternate Path step 5 — Engagement level Zoom/Pencil description

update public.cells
set description = 'Because the tutor was able to check in on the student during the Zoom/Pencil breakout room, the student''s engagement level can be set.'
where id in (
  'a0000000-0000-4000-8000-000000040606',
  'a0000000-0000-4000-8000-000000060606'
);
