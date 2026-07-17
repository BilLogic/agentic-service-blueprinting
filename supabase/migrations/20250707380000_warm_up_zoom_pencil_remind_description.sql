-- Warm-Up Happy Path step 4 / Alternate Path step 3 — Remind student Zoom/Pencil description

update public.cells
set description = 'While in the breakout room on Zoom/Pencil, the tutor reminds the student that can ask for help on content and support.'
where id in (
  'a0000000-0000-4000-8000-000000040406',
  'a0000000-0000-4000-8000-000000060406'
);
