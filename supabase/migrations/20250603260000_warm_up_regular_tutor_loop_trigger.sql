-- Warm-Up Happy Path: Regular Tutor step 8 → step 1 loop

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000050112',
  'a0000000-0000-4000-8000-000000040803',
  'a0000000-0000-4000-8000-000000040103'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
