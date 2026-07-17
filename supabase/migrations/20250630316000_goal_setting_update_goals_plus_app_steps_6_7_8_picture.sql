-- Update Goals path — PLUS App steps 6–8 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out effort and progress goal settings and quantities with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/update-goals/plus-app/step-06-fill-goal-settings-quantity.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000b00606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'If prompted, the tutor fills out the goal achievement strategy with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/update-goals/plus-app/step-07-goal-achievement-strategy.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000b00706';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor saves the updated goal with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/update-goals/plus-app/step-08-save-goal.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000b00806';
