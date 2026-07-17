-- Onboarding Modules Happy Path — Google Quiz step 5 screenshot
-- (shown in the detail panel alongside the shared Google Form logo).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Quiz embedded in Notion',
    'description', 'The tutor completes the Google Quiz embedded in the Notion module to check their understanding.',
    'picture', '/blueprint-images/onboarding-modules/happy-path/google-quiz/step-05-module-quiz.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110506';
