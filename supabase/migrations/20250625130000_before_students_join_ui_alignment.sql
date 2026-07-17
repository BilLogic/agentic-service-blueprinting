-- Align Before Students Join UI with other in-session compare scenarios.

update public.service_scenarios
set
  description = 'Teachers and tutors prepare the session before students join.',
  view_type = 'side-by-side'
where id = 'a0000000-0000-4000-8000-000000000201';

update public.layers
set row_position = 4
where id = 'a0000000-0000-4000-8000-000000000835'
  and path_id = 'a0000000-0000-4000-8000-000000000809';

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000000834'
  and path_id = 'a0000000-0000-4000-8000-000000000809';
