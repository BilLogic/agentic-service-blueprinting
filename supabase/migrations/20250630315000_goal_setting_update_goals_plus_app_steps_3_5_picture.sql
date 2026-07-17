-- Update Goals path — PLUS App steps 3 and 5 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the update goals modal in the PLUS app with the student, which displays the last goal cycle overview and system suggestions for effort and progress goals.',
    'picture', '/blueprint-images/goal-setting/update-goals/plus-app/step-03-update-goals-modal.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000b00306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'After reviewing the last goal cycle overview with the student, the tutor starts updating goals for the next goal cycle in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/update-goals/plus-app/step-05-start-updating-goals.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000b00506';
