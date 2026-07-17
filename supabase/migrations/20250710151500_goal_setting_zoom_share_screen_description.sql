-- Goal Setting (all paths): Share Screen Zoom/Pencil description.

update public.cells
set description = 'The tutor shares screen via Zoom/Pencil screen share feature.'
where id in (
  'a0000000-0000-4000-8000-0000001a0206',
  'a0000000-0000-4000-8000-0000001f0306',
  'a0000000-0000-4000-8000-000000a00306',
  'a0000000-0000-4000-8000-000000b00306',
  'a0000000-0000-4000-8000-000000c00406',
  'a0000000-0000-4000-8000-000000d00406'
);
