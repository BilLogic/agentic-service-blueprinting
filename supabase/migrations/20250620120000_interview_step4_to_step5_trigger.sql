-- Interview happy path: step 4 Back Stage Actions → step 5 Front Stage Actions
insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098041',
  'a0000000-0000-4000-8000-000000090407',
  'a0000000-0000-4000-8000-000000090504'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
