-- Discovery (Application) — route step 2 Social Media through Back Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000078002',
    'a0000000-0000-4000-8000-000000070207',
    'a0000000-0000-4000-8000-000000070208'
  ),
  (
    'a0000000-0000-4000-8000-000000078016',
    'a0000000-0000-4000-8000-000000070208',
    'a0000000-0000-4000-8000-000000070206'
  ),
  (
    'a0000000-0000-4000-8000-000000728002',
    'a0000000-0000-4000-8000-000000720207',
    'a0000000-0000-4000-8000-000000720208'
  ),
  (
    'a0000000-0000-4000-8000-000000728016',
    'a0000000-0000-4000-8000-000000720208',
    'a0000000-0000-4000-8000-000000720206'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
