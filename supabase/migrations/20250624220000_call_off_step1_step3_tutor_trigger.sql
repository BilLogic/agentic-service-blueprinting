-- Call-off Request: step 1 Regular Tutor → step 3 Regular Tutor

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000095003',
    'a0000000-0000-4000-8000-000000170103',
    'a0000000-0000-4000-8000-000000170303'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
