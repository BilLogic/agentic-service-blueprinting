-- Update Goals Edge Case path — PLUS App step 10 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finalizes updating goals with the student in the PLUS app, which displays the goals updated summary with effort and progress goals and goal achievement strategy.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-10-finalize-updating-goals.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d01006';
