-- Onboarding Modules Happy Path — PLUS App step 1 screenshot.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor opens the PLUS app and starts the next uncompleted onboarding module.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/plus-app/step-01-module-opening.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110106';
