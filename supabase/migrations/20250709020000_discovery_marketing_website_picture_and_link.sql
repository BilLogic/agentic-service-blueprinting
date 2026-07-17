-- Discovery — Marketing Website screenshot and tutors.plus link (step 3).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Marketing Website',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-03-marketing-website.png'
  ),
  jsonb_build_object(
    'type', 'url',
    'label', 'Visit marketing website',
    'url', 'https://www.tutors.plus/'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070306',
  'a0000000-0000-4000-8000-000000720306'
);
