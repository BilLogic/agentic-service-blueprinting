-- Warm-Up Mark as helped — PLUS App description

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'Once the tutor marks the student selects engagement level, the tutor is able to mark the student as helped in the Student Dashboard screen of the plus app.',
    'picture', '/blueprint-images/warm-up/shared/plus-app/step-06-your-students-attendance-engagement.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5699-69300&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000040706',
  'a0000000-0000-4000-8000-000000060706'
);
