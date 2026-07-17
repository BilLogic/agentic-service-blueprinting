-- Call-off Request Happy Path — Google Spreadsheet step 5 logo.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Spreadsheet',
    'description', 'The tutor supervisor team reviews tutor availabilities in a Google Spreadsheet to identify who can fill in.',
    'picture', '/blueprint-images/shared/back-stage-tech/google-sheets-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170508';
