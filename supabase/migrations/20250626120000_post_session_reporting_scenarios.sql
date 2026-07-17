-- Post-session phase: Reporting an Issue and Reporting Hours scenarios

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000207',
    'a0000000-0000-4000-8000-000000000105',
    'Reporting an Issue',
    'Tutors report session issues to the tutor supervisor team after the session.',
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000208',
    'a0000000-0000-4000-8000-000000000105',
    'Reporting Hours',
    'Tutors log their tutoring hours after the session.',
    2,
    'side-by-side'
  )
on conflict (id) do update set
  phase_id = excluded.phase_id,
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;
