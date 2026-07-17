-- Standard Scheduling step 2: Front Stage Tech → Regular Tutor.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000093004',
  'a0000000-0000-4000-8000-000000140206',
  'a0000000-0000-4000-8000-000000140203'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
