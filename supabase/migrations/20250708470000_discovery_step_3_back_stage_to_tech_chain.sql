-- Discovery (Application) — route step 3 Marketing Website through Back Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000078003',
    'a0000000-0000-4000-8000-000000070307',
    'a0000000-0000-4000-8000-000000070308'
  ),
  (
    'a0000000-0000-4000-8000-000000078017',
    'a0000000-0000-4000-8000-000000070308',
    'a0000000-0000-4000-8000-000000070306'
  ),
  (
    'a0000000-0000-4000-8000-000000728003',
    'a0000000-0000-4000-8000-000000720307',
    'a0000000-0000-4000-8000-000000720308'
  ),
  (
    'a0000000-0000-4000-8000-000000728017',
    'a0000000-0000-4000-8000-000000720308',
    'a0000000-0000-4000-8000-000000720306'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
