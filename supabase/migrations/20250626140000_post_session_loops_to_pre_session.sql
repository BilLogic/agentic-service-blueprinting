-- Post-session lifecycle loops back to pre-session after the last scenario.

update public.phases
set
  loops_to_phase_id = 'a0000000-0000-4000-8000-000000000103',
  description = 'Wrap-up after session; may return to pre-session'
where id = 'a0000000-0000-4000-8000-000000000105';
