-- Set Goals path — PLUS App step 9 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finalizes goal setting with the student in the PLUS app, reviewing the saved effort and progress goals and goal achievement strategy summary.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-09-finalize-goal-setting.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f0906';
