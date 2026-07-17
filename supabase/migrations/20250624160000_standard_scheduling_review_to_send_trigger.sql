-- Standard Scheduling: arrow from step 1 back stage review → step 2 front stage send

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000093001',
    'a0000000-0000-4000-8000-000000140107',
    'a0000000-0000-4000-8000-000000140204'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
