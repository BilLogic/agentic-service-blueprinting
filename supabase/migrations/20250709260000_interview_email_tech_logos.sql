-- Interview & Offer — Email tech logos (steps 2 and 5 Front Stage Tech, step 4 Back Stage Tech).

update public.cells
set picture = '/blueprint-images/shared/front-stage-tech/email-logo.png'
where id in (
  'a0000000-0000-4000-8000-000000090206',
  'a0000000-0000-4000-8000-000000090506'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090408';
