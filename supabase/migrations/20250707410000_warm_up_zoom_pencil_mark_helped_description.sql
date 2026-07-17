-- Warm-Up Happy Path step 7 / Alternate Path step 6 — Mark helped Zoom/Pencil description

update public.cells
set description = 'Because the tutor was able to check in on the student during the Zoom/Pencil breakout room, the student can be marked as helped.'
where id in (
  'a0000000-0000-4000-8000-000000040706',
  'a0000000-0000-4000-8000-000000060706'
);
