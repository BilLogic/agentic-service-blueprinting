-- Onboarding Modules Happy Path — PLUS App step 2 screenshot.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finds the link to the onboarding module content that exists on Notion on the individual module page in the PLUS app.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-02-accessing-content.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor follows the Notion link from the PLUS app to begin reading the onboarding module content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110206';
