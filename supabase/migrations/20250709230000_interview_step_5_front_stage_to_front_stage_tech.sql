-- Interview & Offer — add step 5 Front Stage Actions → Front Stage Tech trigger.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098042',
  'a0000000-0000-4000-8000-000000090504',
  'a0000000-0000-4000-8000-000000090506'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
