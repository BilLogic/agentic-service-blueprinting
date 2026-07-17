-- Session Sign Up Happy Path — PLUS app step 1 Figma link.

update public.cells
set
  description = 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'PLUS app',
      'description', 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.',
      'picture', '/blueprint-images/session-sign-up/happy-path/plus-app/step-01-sign-up-success.png',
      'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=1-175&t=oLK2F4Rnq3lDBomK-1'
    )
  )
where id = 'a0000000-0000-4000-8000-000000130106';
