-- Session Sign Up step 1: Back Stage Actions → Back Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000092004',
  'a0000000-0000-4000-8000-000000130107',
  'a0000000-0000-4000-8000-000000130108'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
