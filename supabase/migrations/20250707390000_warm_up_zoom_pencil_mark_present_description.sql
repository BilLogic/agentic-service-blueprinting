-- Warm-Up Happy Path step 5 / Alternate Path step 4 — Mark present Zoom/Pencil description

update public.cells
set description = 'Because the tutor was able to check in on the student during the Zoom/Pencil breakout room, the student can be marked as present.'
where id in (
  'a0000000-0000-4000-8000-000000040506',
  'a0000000-0000-4000-8000-000000060506'
);
