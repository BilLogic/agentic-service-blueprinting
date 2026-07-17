-- Set Goals path — PLUS App step 3 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor shares the set goals modal in the PLUS app with the student, which displays the student''s goal cycle information and indicates no goals have been set yet.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-03-set-goals-modal.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0306';
