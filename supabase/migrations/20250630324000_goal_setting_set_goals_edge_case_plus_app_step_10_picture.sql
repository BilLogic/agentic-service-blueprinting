-- Set Goals Edge Case path — PLUS App step 10 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finalizes goal setting with the student in the PLUS app, reviewing the saved effort and progress goals and goal achievement strategy summary.',
    'picture', '/blueprint-images/goal-setting/set-goals-edge-case/plus-app/step-10-finalize-goal-setting.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000c01006';
