-- Lesson Modules Happy Path — remove Back Stage Tech from all steps.

delete from public.cell_triggers
where source_cell_id in (
  'a0000000-0000-4000-8000-000000120108',
  'a0000000-0000-4000-8000-000000120208',
  'a0000000-0000-4000-8000-000000120308'
)
or target_cell_id in (
  'a0000000-0000-4000-8000-000000120108',
  'a0000000-0000-4000-8000-000000120208',
  'a0000000-0000-4000-8000-000000120308'
);

delete from public.cells
where id in (
  'a0000000-0000-4000-8000-000000120108',
  'a0000000-0000-4000-8000-000000120208',
  'a0000000-0000-4000-8000-000000120308'
);

delete from public.layers
where id = 'a0000000-0000-4000-8000-000000001245';

update public.layers
set row_position = 4
where id = 'a0000000-0000-4000-8000-000000001244';

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000001246';
