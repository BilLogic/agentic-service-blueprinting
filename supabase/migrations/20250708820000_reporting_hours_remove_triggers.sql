-- Reporting Hours — remove all cell triggers.

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000000812'
);
