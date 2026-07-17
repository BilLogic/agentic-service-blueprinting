-- Goal Setting (all paths): Leave breakout room Zoom/Pencil description.

update public.cells
set description = 'The tutor leaves the student''s Zoom/Pencil breakout room.'
where id in (
  'a0000000-0000-4000-8000-0000001a0606',
  'a0000000-0000-4000-8000-0000001f1006',
  'a0000000-0000-4000-8000-000000a00706',
  'a0000000-0000-4000-8000-000000b01006',
  'a0000000-0000-4000-8000-000000c01106',
  'a0000000-0000-4000-8000-000000d01106'
);
