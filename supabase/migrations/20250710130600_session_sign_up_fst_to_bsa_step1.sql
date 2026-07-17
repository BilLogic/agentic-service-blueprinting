-- Session Sign Up step 1: Front Stage Tech → Back Stage Actions.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000092001',
  'a0000000-0000-4000-8000-000000130106',
  'a0000000-0000-4000-8000-000000130107'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
