-- Interview & Offer — Zoom tech logos (step 3 Front Stage Tech, step 4 Back Stage Tech).

update public.cells
set picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
where id = 'a0000000-0000-4000-8000-000000090306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090408';
