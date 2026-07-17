-- Lesson Modules Happy Path — Front Stage Tech and Back Stage Tech pill descriptions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor starts the next uncompleted assigned lesson in the PLUS app.'
  )
)
where id = 'a0000000-0000-4000-8000-000000120106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor works through the lesson questions in the PLUS app.'
  )
)
where id = 'a0000000-0000-4000-8000-000000120206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the lesson content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000120208';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor finishes the lesson in the PLUS app and receives their score.'
  )
)
where id = 'a0000000-0000-4000-8000-000000120306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The instructional design team uses Notion to design and maintain the lesson content.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000120308';
