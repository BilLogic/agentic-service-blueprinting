-- Onboarding Modules — use Google Form logo for Google Quiz embedded in notion.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Quiz embedded in notion',
    'description', 'The tutor completes the Google Quiz embedded in the Notion lesson to check their understanding.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110506';
