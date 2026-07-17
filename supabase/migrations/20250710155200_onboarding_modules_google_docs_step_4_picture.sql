-- Onboarding Modules Happy Path — Google Docs/Slides step 4 screenshot
-- (Supplementary materials; Google Docs/Slides lives on step 4).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reviews supplementary materials linked from the Notion module content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Docs/ Slides',
    'description', 'The tutor opens any Google Docs or Slides linked as supplementary materials for the module content.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/google-docs/step-04-supplementary-materials.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110406';
