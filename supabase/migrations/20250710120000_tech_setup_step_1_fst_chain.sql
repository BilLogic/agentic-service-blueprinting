-- Tech Setup step 1 — route through Front Stage Tech (Email).

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000100104',
  target_cell_id = 'a0000000-0000-4000-8000-000000100106'
where id = 'a0000000-0000-4000-8000-000000088001';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088002',
  'a0000000-0000-4000-8000-000000100106',
  'a0000000-0000-4000-8000-000000100103'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
