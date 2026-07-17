-- Goal Setting happy path — PLUS App step 4 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'If prompted, the tutor fills out the goal achievement strategy form in the PLUS app with the student, depending on the point the session is in the goal cycle.',
    'picture', '/blueprint-images/goal-setting/happy-path/plus-app/step-04-goal-achievement-strategy.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0406';
