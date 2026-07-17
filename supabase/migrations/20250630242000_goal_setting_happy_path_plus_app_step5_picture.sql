-- Goal Setting happy path — PLUS App step 5 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor saves the goal activity with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/happy-path/plus-app/step-05-save-goals-summary.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0506';
