-- Set Goals Edge Case path — PLUS App step 4 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the set goals modal in the PLUS app with the student while screen sharing, which displays the student''s goal cycle information and indicates no goals have been set yet.',
    'picture', '/blueprint-images/goal-setting/set-goals-edge-case/plus-app/step-04-set-goals-modal.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000c00406';
