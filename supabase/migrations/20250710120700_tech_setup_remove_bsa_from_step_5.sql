-- Tech Setup — remove Back Stage Actions from step 5 (Attend I-9 meeting).

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000100507'
   or target_cell_id = 'a0000000-0000-4000-8000-000000100507';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000100507';

-- Restore Back Stage Actions on step 6 (Payroll setup) if missing.
insert into public.cells (id, path_id, layer_id, step_id, content)
values (
  'a0000000-0000-4000-8000-000000100607',
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000834',
  'a0000000-0000-4000-8000-000000000824',
  'PLUS Supervisor Team fills out corresponding paperwork for student employment in payroll software'
)
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;
