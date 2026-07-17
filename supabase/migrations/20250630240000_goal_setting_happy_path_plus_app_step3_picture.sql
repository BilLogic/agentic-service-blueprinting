-- Goal Setting happy path — PLUS App step 3 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out the update, check, or set goals modal in the PLUS app with the student, depending on the point the session is in the goal cycle.',
    'picture', '/blueprint-images/goal-setting/happy-path/plus-app/step-03-set-goals-modal.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001a0306';
