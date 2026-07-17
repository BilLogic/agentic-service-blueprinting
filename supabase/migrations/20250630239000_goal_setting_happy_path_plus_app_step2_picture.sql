-- Goal Setting happy path — PLUS App step 2 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the initial goal setting screen in the PLUS app, which is dependent on the point in the goal cycle the session is in.',
    'picture', '/blueprint-images/goal-setting/happy-path/plus-app/step-02-initial-goal-setting-screen.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0206';
