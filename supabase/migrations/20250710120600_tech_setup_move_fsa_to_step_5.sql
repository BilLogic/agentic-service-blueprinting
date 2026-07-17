-- Tech Setup — move Front Stage Actions from step 6 (Payroll) to step 5 (Attend I-9 meeting).

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000088041';

update public.cells
set
  id = 'a0000000-0000-4000-8000-000000100504',
  step_id = 'a0000000-0000-4000-8000-000000000827'
where id = 'a0000000-0000-4000-8000-000000100604';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088041',
  'a0000000-0000-4000-8000-000000100503',
  'a0000000-0000-4000-8000-000000100504'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
