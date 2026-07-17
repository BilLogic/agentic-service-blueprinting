-- Reporting an Issue step 1: tutors → Front Stage Tech → Front Stage Actions.

update public.cell_triggers
set target_cell_id = 'a0000000-0000-4000-8000-0000001d0106'
where id in (
  'a0000000-0000-4000-8000-000000098070',
  'a0000000-0000-4000-8000-000000098074'
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values (
  'a0000000-0000-4000-8000-000000098076',
  'a0000000-0000-4000-8000-0000001d0106',
  'a0000000-0000-4000-8000-0000001d0104'
)
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
