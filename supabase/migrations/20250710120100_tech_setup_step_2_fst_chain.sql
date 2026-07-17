-- Tech Setup step 2 — route through Front Stage Tech (Clearance Obtainment guide).

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000100204',
  target_cell_id = 'a0000000-0000-4000-8000-000000100206'
where id = 'a0000000-0000-4000-8000-000000088022';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088023',
  'a0000000-0000-4000-8000-000000100206',
  'a0000000-0000-4000-8000-000000100203'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
