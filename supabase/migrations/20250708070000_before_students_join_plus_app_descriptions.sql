-- Before Students Join — PLUS App Front Stage Tech descriptions (steps 1, 2, 5)

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The lead tutor and tutors open the Session Detail page in the PLUS app to set up the classroom before students join.',
    'picture', '/blueprint-images/shared/step-visual-placeholder.svg',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs'
  )
)
where id = 'a0000000-0000-4000-8000-000000180106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutors use the PLUS app to access session details as they open the virtual tutoring session.',
    'picture', '/blueprint-images/shared/step-visual-placeholder.svg',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs'
  )
)
where id = 'a0000000-0000-4000-8000-000000180206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutors review the student list for the session in the PLUS app before distributing students to breakout rooms.',
    'picture', '/blueprint-images/shared/step-visual-placeholder.svg',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs'
  )
)
where id = 'a0000000-0000-4000-8000-000000180506';
