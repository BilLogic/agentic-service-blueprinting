-- Fill-in Request step 3: connect Front Stage Tech → Front Stage Actions.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000094011',
  'a0000000-0000-4000-8000-000000150306',
  'a0000000-0000-4000-8000-000000150304'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
