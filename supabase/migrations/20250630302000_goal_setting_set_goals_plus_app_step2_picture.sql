-- Set Goals path — PLUS App step 2 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor views the Your Students screen in the PLUS app and clicks the Set Goals CTA in the Action column for the student they are working with.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-02-set-goals-cta.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0206';
