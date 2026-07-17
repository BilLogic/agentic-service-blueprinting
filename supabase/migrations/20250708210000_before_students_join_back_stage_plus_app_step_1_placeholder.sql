-- Before Students Join Happy Path — Back Stage Tech step 1 PLUS App placeholder visual and Figma link

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor supervisor team sets up session details in the PLUS app.',
    'picture', '/blueprint-images/shared/step-visual-placeholder.svg',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs'
  )
)
where id = 'a0000000-0000-4000-8000-000000180108';
