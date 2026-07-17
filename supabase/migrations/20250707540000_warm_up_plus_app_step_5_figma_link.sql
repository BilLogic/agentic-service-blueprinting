-- Warm-Up Happy path step 5 / Alternate path step 4 — PLUS App Figma link

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'picture', '/blueprint-images/warm-up/shared/plus-app/step-05-your-students.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3377-227498&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000040506',
  'a0000000-0000-4000-8000-000000060506'
);
