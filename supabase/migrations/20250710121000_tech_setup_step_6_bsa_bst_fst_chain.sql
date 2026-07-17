-- Tech Setup step 6 — Back Stage Actions → Back Stage Tech → Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000088043',
    'a0000000-0000-4000-8000-000000100607',
    'a0000000-0000-4000-8000-000000100608'
  ),
  (
    'a0000000-0000-4000-8000-000000088044',
    'a0000000-0000-4000-8000-000000100608',
    'a0000000-0000-4000-8000-000000100606'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
