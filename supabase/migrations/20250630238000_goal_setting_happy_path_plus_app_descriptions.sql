-- Goal Setting happy path — PLUS App Front Stage Tech step descriptions (steps 2–5)

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the initial goal setting screen in the PLUS app, which is dependent on the point in the goal cycle the session is in.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out the update, check, or set goals modal in the PLUS app with the student, depending on the point the session is in the goal cycle.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'If prompted, the tutor fills out the goal achievement strategy form in the PLUS app with the student, depending on the point the session is in the goal cycle.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor saves the goal activity with the student in the PLUS app.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0506';
