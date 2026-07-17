-- Before Students Join Happy Path step 5 — PLUS App Your Students screenshot and Figma link

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutors review the student list for the session in the PLUS app.',
    'picture', '/blueprint-images/before-students-join/happy-path/plus-app/step-05-your-students.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=4764-199729&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000180506';
