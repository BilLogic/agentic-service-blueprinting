-- Wrap-Up Happy Path step 4 — PLUS App placeholder screenshot and Figma link

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor completes the reflection form in the PLUS app after the session (placeholder).',
    'picture', '/blueprint-images/shared/step-visual-placeholder.svg',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs'
  )
)
where id = 'a0000000-0000-4000-8000-0000001c0406';
