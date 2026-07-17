-- Warm-Up PLUS App — Figma link for engagement, mark helped, and move to next student steps

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'picture', '/blueprint-images/warm-up/shared/plus-app/step-06-your-students-attendance-engagement.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5699-69300&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000040606',
  'a0000000-0000-4000-8000-000000040706',
  'a0000000-0000-4000-8000-000000040906',
  'a0000000-0000-4000-8000-000000060606',
  'a0000000-0000-4000-8000-000000060706',
  'a0000000-0000-4000-8000-000000060906'
);
