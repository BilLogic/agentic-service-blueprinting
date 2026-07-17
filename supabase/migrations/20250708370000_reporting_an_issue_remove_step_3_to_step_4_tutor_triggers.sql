-- Reporting an Issue — remove step 3 Front Stage Actions to step 4 tutor triggers.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000098073',
  'a0000000-0000-4000-8000-000000098075'
);
