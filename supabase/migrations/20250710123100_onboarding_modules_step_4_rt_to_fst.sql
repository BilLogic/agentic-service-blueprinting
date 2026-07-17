-- Onboarding Modules — step 4 Regular Tutor → Front Stage Tech connection.

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000089004',
  'a0000000-0000-4000-8000-000000110403',
  'a0000000-0000-4000-8000-000000110406'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
