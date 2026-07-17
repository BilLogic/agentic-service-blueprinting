-- Onboarding Modules Happy Path — Front Stage Tech and Back Stage Tech pill descriptions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor opens the PLUS app and starts the next uncompleted onboarding module.'
  )
)
where id = 'a0000000-0000-4000-8000-000000110106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor opens the individual module page in the PLUS app to find the link to the lesson content.'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor follows the Notion link from the PLUS app to begin reading the onboarding module lesson content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reads through the onboarding module lesson content in Notion.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor reviews supplementary materials linked from the Notion lesson.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Docs/ Slides',
    'description', 'The tutor opens any Google Docs or Slides linked as supplementary materials for the lesson.'
  )
)
where id = 'a0000000-0000-4000-8000-000000110406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Quiz embedded in notion',
    'description', 'The tutor completes the Google Quiz embedded in the Notion lesson to check their understanding.'
  )
)
where id = 'a0000000-0000-4000-8000-000000110506';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor fills out the module reflection questions in the PLUS app.'
  )
)
where id = 'a0000000-0000-4000-8000-000000110606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the reflection questions for the module.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000110608';
