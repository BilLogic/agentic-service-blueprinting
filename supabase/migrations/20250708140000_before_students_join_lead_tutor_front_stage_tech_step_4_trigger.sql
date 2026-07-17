-- Before Students Join — Lead Tutor → Front Stage Tech (step 4)

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000096046', 'a0000000-0000-4000-8000-000000180402', 'a0000000-0000-4000-8000-000000180406')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
