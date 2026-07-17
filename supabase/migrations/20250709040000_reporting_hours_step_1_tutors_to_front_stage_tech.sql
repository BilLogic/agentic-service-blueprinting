-- Reporting Hours — step 1 tutors connect to Front Stage Tech (Workday).

update public.cell_triggers
set target_cell_id = 'a0000000-0000-4000-8000-0000001e0106'
where id in (
  'a0000000-0000-4000-8000-000000098090',
  'a0000000-0000-4000-8000-000000098091'
);
