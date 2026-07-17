-- Set Goals path — PLUS App step 5 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor starts setting the student''s first goals in the PLUS app while sharing their screen, filling out effort goal settings, progress goal settings, and goal achievement strategy.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-05-fill-goal-settings.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0506';
