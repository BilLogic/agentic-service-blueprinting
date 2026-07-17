-- Set Goals path — PLUS App step 11 screenshot

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor navigates back to the Your Students screen in the PLUS app to move on to the next student in the researcher sorted list.',
    'picture', '/blueprint-images/goal-setting/set-goals/plus-app/step-11-next-student.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5920-79843&t=X6VgpWcaJyIr1cSu-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001f1106';
