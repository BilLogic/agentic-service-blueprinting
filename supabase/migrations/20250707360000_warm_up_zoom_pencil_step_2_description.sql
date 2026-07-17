-- Warm-Up Happy and Alternate paths — Zoom/Pencil Front Stage Tech step 2 description

update public.cells
set description = 'Once the tutor joins the breakout room, they greet the student virtually through Zoom/Pencil.'
where id in (
  'a0000000-0000-4000-8000-000000040206',
  'a0000000-0000-4000-8000-000000060206'
);
