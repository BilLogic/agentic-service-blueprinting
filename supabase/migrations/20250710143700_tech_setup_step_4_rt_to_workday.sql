-- Tech Setup step 4: Regular Tutor → Front Stage Tech (Workday).

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000088033',
  'a0000000-0000-4000-8000-000000100403',
  'a0000000-0000-4000-8000-000000100406'
)
on conflict (id) do update
set source_cell_id = excluded.source_cell_id,
    target_cell_id = excluded.target_cell_id;
