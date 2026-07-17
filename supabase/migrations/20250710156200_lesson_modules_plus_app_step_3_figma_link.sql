-- Lesson Modules Happy Path — PLUS App step 3 Figma link.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finishes the lesson in the PLUS app and receives their score.',
    'picture', '/blueprint-images/lesson-modules/happy-path/plus-app/step-03-lesson-complete.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=3385-256699&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000120306';
