-- Update Goals Edge Case path — PLUS App steps 4–6 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the update goals modal in the PLUS app with the student while screen sharing, which displays the last goal cycle overview and system suggestions for effort and progress goals.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-04-update-goals-modal.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d00406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor reviews the last goal cycle overview and system suggestions for effort and progress goals with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-05-review-last-goal-cycle.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d00506';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'After reviewing the last goal cycle overview with the student, the tutor starts updating goals for the next goal cycle in the PLUS app while sharing their screen.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-06-start-updating-goals.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d00606';
