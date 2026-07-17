-- Fill-in Request step 1: connect Front Stage Tech → Back Stage Actions.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000094009',
  'a0000000-0000-4000-8000-000000150106',
  'a0000000-0000-4000-8000-000000150107'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
