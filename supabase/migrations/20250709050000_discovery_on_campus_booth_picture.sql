-- Discovery — On-campus booth step 4 visual.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Posters',
    'description', 'Printed posters on campus promote PLUS tutoring opportunities and point prospective tutors toward learning more about the program.'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'On-campus booth',
    'description', 'A physical booth at on-campus job fairs where the Tutor Supervisor team meets prospective tutors, answers questions, and shares information about joining PLUS.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-04-on-campus-booth.png'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070406',
  'a0000000-0000-4000-8000-000000720406'
);
