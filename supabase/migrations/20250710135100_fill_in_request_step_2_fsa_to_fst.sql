-- Fill-in Request step 2: connect Front Stage Actions → Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000094003',
  'a0000000-0000-4000-8000-000000150204',
  'a0000000-0000-4000-8000-000000150206'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
