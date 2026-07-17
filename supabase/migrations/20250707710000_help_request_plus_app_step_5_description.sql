-- Help Request step 5 — PLUS App description

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor navigates back to the Student Dashboard screen to move on to the student on the researcher sorted list.',
    'picture', '/blueprint-images/help-request/happy-path/plus-app/step-05-your-students.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5699-69300&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id = 'a0000000-0000-4000-8000-0000001b0506';
