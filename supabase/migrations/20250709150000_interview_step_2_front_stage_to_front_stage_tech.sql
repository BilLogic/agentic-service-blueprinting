-- Interview & Offer — step 2 Front Stage Actions → Front Stage Tech.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098004',
  'a0000000-0000-4000-8000-000000090204',
  'a0000000-0000-4000-8000-000000090206'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
