-- Fill-in Request step 2: connect Front Stage Tech → Regular Tutor.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000094010',
  'a0000000-0000-4000-8000-000000150206',
  'a0000000-0000-4000-8000-000000150203'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
