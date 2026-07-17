-- Update Goals Edge Case path — PLUS App steps 2 and 3 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor views the Your Students screen in the PLUS app during a mid-cycle goal check-in session and sees the warning action color with an Update Goals CTA for a student who needs to update their goals.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-02-warning-update-goals-cta.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d00206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor clicks the Update Goals CTA in the Action column in the PLUS app for the student they are working with.',
    'picture', '/blueprint-images/goal-setting/update-goals-edge-case/plus-app/step-03-update-goals-cta.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000d00306';
