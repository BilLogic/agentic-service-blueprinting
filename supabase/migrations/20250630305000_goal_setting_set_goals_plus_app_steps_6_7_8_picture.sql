-- Set Goals path — PLUS App steps 6–8 screenshots

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out effort and progress goal settings and quantities with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-06-fill-goal-settings-quantity.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'If prompted, the tutor fills out the goal achievement strategy with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-07-goal-achievement-strategy.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0706';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor saves the goal with the student in the PLUS app.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-08-save-goal.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0806';
