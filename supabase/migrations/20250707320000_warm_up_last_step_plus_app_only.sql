-- Warm-Up Happy and Alternate paths: Move to Next Student uses PLUS App only (no Zoom/Pencil).

update public.cells
set content = 'PLUS App'
where id in (
  'a0000000-0000-4000-8000-000000040906',
  'a0000000-0000-4000-8000-000000060906'
);
