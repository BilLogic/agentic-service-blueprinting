-- Before Students Join step 2: remove Back Stage Actions → Front Stage Tech;
-- add Back Stage Tech → Front Stage Tech.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000096052';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000096064',
  'a0000000-0000-4000-8000-000000180208',
  'a0000000-0000-4000-8000-000000180206'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
