-- Move pre-session scenarios under the in-session phase; post-session loops to in-session.

update public.service_scenarios
set phase_id = 'a0000000-0000-4000-8000-000000000104'
where phase_id = 'a0000000-0000-4000-8000-000000000103';

update public.phases
set
  loops_to_phase_id = 'a0000000-0000-4000-8000-000000000104',
  description = 'Wrap-up after session; may return to in-session'
where id = 'a0000000-0000-4000-8000-000000000105';
