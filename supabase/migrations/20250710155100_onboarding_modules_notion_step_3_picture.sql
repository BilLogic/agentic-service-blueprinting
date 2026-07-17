-- Onboarding Modules Happy Path — Notion step 3 reading-lesson screenshot
-- (shown in the detail panel alongside the shared Notion logo).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reads through the onboarding module content in Notion.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/notion/step-03-reading-lesson.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110306';
