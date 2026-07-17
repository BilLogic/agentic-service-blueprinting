-- Warm-Up Move to Next Student — PLUS App description (last Front Stage Tech step)

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor moves on to the next student on the researcher sorted list in the Student Dashboard screen of the plus app.',
    'picture', '/blueprint-images/warm-up/shared/plus-app/step-06-your-students-attendance-engagement.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=5699-69300&t=LvyyxUtQVUCLMMc2-1'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000040906',
  'a0000000-0000-4000-8000-000000060906'
);
