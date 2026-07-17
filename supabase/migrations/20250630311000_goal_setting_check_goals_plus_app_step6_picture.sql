-- Check Goals path — PLUS App step 6 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finalizes checking goals with the student in the PLUS app, which displays the goals checked summary with effort and progress goals and goal achievement strategy.',
    'picture', '/blueprint-images/goal-setting/check-goals/plus-app/step-06-finalize-check-goals.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000a00606';
