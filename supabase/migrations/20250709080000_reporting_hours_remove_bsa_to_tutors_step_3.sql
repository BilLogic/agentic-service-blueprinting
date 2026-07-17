-- Reporting Hours — remove Back Stage Actions step 2 → tutor step 3 connections.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000098092',
  'a0000000-0000-4000-8000-000000098093'
);
