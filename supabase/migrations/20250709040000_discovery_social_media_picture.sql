-- Discovery — Social Media step 2 visual (LinkedIn).

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Social Media',
    'description', 'Potential tutors discover PLUS through social posts on platforms like Instagram, LinkedIn, and similar channels where the marketing team shares recruiting content.',
    'picture', '/blueprint-images/application-discovery/happy-path/front-stage-tech/step-02-social-media.png'
  )
)
where id in (
  'a0000000-0000-4000-8000-000000070206',
  'a0000000-0000-4000-8000-000000720206'
);
