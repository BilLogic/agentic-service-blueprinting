-- Check Goals path — PLUS App steps 3 and 5 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the check goals modal in the PLUS app with the student, which displays the student''s current effort and progress goals and goal achievement strategy.',
    'picture', '/blueprint-images/goal-setting/check-goals/plus-app/step-03-check-goals-modal.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000a00306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'After reviewing goals with the student, the tutor clicks the Check Goals button in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/check-goals/plus-app/step-05-check-goals-button.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000a00506';
