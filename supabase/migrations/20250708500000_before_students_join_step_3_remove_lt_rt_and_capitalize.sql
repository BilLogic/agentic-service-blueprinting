-- Before Students Join Happy Path: remove step 3 Lead Tutor ↔ Regular Tutor triggers
-- and capitalize Partner step 4 / Regular Tutor steps 5–6 cell text.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096033',
  'a0000000-0000-4000-8000-000000096034'
);

update public.cells
set content = 'Test the wifi'
where id = 'a0000000-0000-4000-8000-000000180401';

update public.cells
set content = 'Review student list for session'
where id = 'a0000000-0000-4000-8000-000000180503';

update public.cells
set content = 'Receive breakout rooms from Lead tutor'
where id = 'a0000000-0000-4000-8000-000000180603';
