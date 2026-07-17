-- Call-off Request step 4: connect Front Stage Tech → Front Stage Actions.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000095013',
  'a0000000-0000-4000-8000-000000170406',
  'a0000000-0000-4000-8000-000000170404'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
