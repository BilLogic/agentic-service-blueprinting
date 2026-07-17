-- Set Goals Edge Case path — PLUS App step 6 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor starts setting the student''s first goals in the PLUS app while sharing their screen, filling out effort goal settings, progress goal settings, and goal achievement strategy.',
    'picture', '/blueprint-images/goal-setting/set-goals-edge-case/plus-app/step-06-fill-goal-settings.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000c00606';
