-- Warm-Up Happy and Alternate paths — Zoom/Pencil Front Stage Tech step 1 description

update public.cells
set description = 'The tutor utilizes Zoom/Pencil to virtually connect with the student. At this stage, they enter the breakout room the student has been assigned to that they are working with.'
where id in (
  'a0000000-0000-4000-8000-000000040106',
  'a0000000-0000-4000-8000-000000060106'
);
