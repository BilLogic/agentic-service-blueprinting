-- Tech Setup step 6 — update Regular Tutor copy and link to Front Stage Tech (Workday).

update public.cells
set content = 'Sets up payroll'
where id = 'a0000000-0000-4000-8000-000000100603';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088042',
  'a0000000-0000-4000-8000-000000100603',
  'a0000000-0000-4000-8000-000000100606'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
