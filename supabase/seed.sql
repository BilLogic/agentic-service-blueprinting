-- Development seed: service lifecycle with phases and in-session scenarios

insert into public.service_lifecycles (id, name, description)
values (
  'a0000000-0000-4000-8000-000000000001',
  'PLUS Application',
  'Application through onboarding and session lifecycle'
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

-- Replace any prior demo phases/scenarios for this lifecycle
delete from public.phases
where service_lifecycle_id = 'a0000000-0000-4000-8000-000000000001';

insert into public.phases (
  id,
  service_lifecycle_id,
  name,
  description,
  order_position,
  loops_to_phase_id
)
values
  (
    'a0000000-0000-4000-8000-000000000101',
    'a0000000-0000-4000-8000-000000000001',
    'Application',
    'Potential tutors discover, interview and receive an offer to join the PLUS Team',
    1,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000102',
    'a0000000-0000-4000-8000-000000000001',
    'Onboarding',
    'The tutor goes through required onboarding before joining a tutoring session.',
    2,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000103',
    'a0000000-0000-4000-8000-000000000001',
    'Pre-session',
    'Preparation before a live tutoring session',
    3,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000104',
    'a0000000-0000-4000-8000-000000000001',
    'In-session',
    'Tutoring activities that occur during live sessions.',
    4,
    null
  ),
  (
    'a0000000-0000-4000-8000-000000000105',
    'a0000000-0000-4000-8000-000000000001',
    'Post-session',
    'Wrap-up after session; may return to pre-session',
    5,
    'a0000000-0000-4000-8000-000000000103'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  loops_to_phase_id = excluded.loops_to_phase_id;

-- Application phase scenarios
delete from public.service_scenarios
where phase_id = 'a0000000-0000-4000-8000-000000000101';

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000121',
    'a0000000-0000-4000-8000-000000000101',
    'Discovery',
    'Potential tutors discover plus',
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000122',
    'a0000000-0000-4000-8000-000000000101',
    'Interview & Offer',
    'Potential Tutors Interview for role and receive an offer.',
    2,
    'side-by-side'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;

-- Onboarding phase scenarios
delete from public.service_scenarios
where phase_id = 'a0000000-0000-4000-8000-000000000102';

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000120',
    'a0000000-0000-4000-8000-000000000102',
    'Tech Setup',
    'The tutor sets up necessary tech and obtains required clearances.',
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000123',
    'a0000000-0000-4000-8000-000000000102',
    'Onboarding Modules',
    'The tutor completes required onboarding modules.',
    2,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000124',
    'a0000000-0000-4000-8000-000000000102',
    'Lesson Modules',
    'The tutor goes through required lessons before joining a tutoring session.',
    3,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000125',
    'a0000000-0000-4000-8000-000000000102',
    'Session Sign Up',
    'The tutor signs up for recurring sessions for the semester.',
    4,
    'side-by-side'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;

-- Pre-session scenarios
delete from public.service_scenarios
where phase_id = 'a0000000-0000-4000-8000-000000000103';

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000126',
    'a0000000-0000-4000-8000-000000000103',
    'Standard Scheduling',
    null,
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000127',
    'a0000000-0000-4000-8000-000000000103',
    'Fill-in Request',
    null,
    2,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000128',
    'a0000000-0000-4000-8000-000000000103',
    'Call-off Request',
    null,
    3,
    'side-by-side'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;

-- In-session scenarios
delete from public.service_scenarios
where phase_id = 'a0000000-0000-4000-8000-000000000104';

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values
  (
    'a0000000-0000-4000-8000-000000000201',
    'a0000000-0000-4000-8000-000000000104',
    'Before Students Join',
    'Teachers and tutors prepare the session before students join.',
    1,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000202',
    'a0000000-0000-4000-8000-000000000104',
    'Student Just Joined',
    'Teachers and tutors welcome students as they join the session.',
    2,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000203',
    'a0000000-0000-4000-8000-000000000104',
    'Warm-Up',
    'Tutors greet and move students to breakout rooms as the session begins.',
    3,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000204',
    'a0000000-0000-4000-8000-000000000104',
    'Goal Setting',
    'Tutors guide students through goal setting in breakout sessions.',
    4,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000205',
    'a0000000-0000-4000-8000-000000000104',
    'Help Request',
    'Tutors receive and resolve student help requests during the session.',
    5,
    'side-by-side'
  ),
  (
    'a0000000-0000-4000-8000-000000000206',
    'a0000000-0000-4000-8000-000000000104',
    'Wrap-Up',
    'Teachers and tutors close breakout sessions, debrief, and complete wrap-up tasks.',
    6,
    'side-by-side'
  )
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;

-- Post-session scenarios
delete from public.service_scenarios
where phase_id = 'a0000000-0000-4000-8000-000000000105';

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
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;

-- Warm-Up Happy Path blueprint (see supabase/seeds/warm_up_happy_path.sql)
-- Application Discovery paths (see supabase/seeds/application_discovery_happy_path.sql and application_discovery_sad_path.sql)
-- Application Interview paths (see supabase/seeds/application_interview_happy_path.sql)
-- Onboarding Tech Setup path (see supabase/seeds/onboarding_tech_setup_happy_path.sql)
-- Onboarding Session Sign Up path (see supabase/seeds/onboarding_session_sign_up_happy_path.sql)
-- Pre-session Standard Scheduling path (see supabase/seeds/pre_session_standard_scheduling_happy_path.sql)
-- Pre-session Fill-in Request path (see supabase/seeds/pre_session_fill_in_request_happy_path.sql)
-- Pre-session Call-off Request path (see supabase/seeds/pre_session_call_off_request_happy_path.sql)
-- In-session Before Students Join path (see supabase/seeds/in_session_before_students_join_happy_path.sql)
-- In-session Student Just Joined path (see supabase/seeds/in_session_students_just_joined_happy_path.sql)
-- In-session Goal-Setting Phase path (see supabase/seeds/in_session_goal_setting_happy_path.sql)
-- In-session Help Request path (see supabase/seeds/in_session_help_request_happy_path.sql)
-- In-session Wrap-Up path (see supabase/seeds/in_session_wrap_up_happy_path.sql)
-- Post-session Reporting an Issue path (see supabase/seeds/post_session_reporting_an_issue_happy_path.sql)
-- Post-session Reporting Hours path (see supabase/seeds/post_session_reporting_hours_happy_path.sql)

-- Legacy catalog row
insert into public.services (name, description, slug)
values
  ('Example API', 'Placeholder service entry for local development', 'example-api')
on conflict (slug) do nothing;
