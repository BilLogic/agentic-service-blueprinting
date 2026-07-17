-- Onboarding phase scenarios

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000120',
    'a0000000-0000-4000-8000-000000000102',
    'Tech Setup',
    'Onboarding tech setup from account creation through environment configuration and completion.',
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000123',
    'a0000000-0000-4000-8000-000000000102',
    'Onboarding Modules',
    'Tutor completes required onboarding modules.',
    2,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000124',
    'a0000000-0000-4000-8000-000000000102',
    'Lesson Modules',
    'Tutor completes lesson module training.',
    3,
    'side-by-side'
  )
on conflict (id) do update set
  phase_id = excluded.phase_id,
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;
