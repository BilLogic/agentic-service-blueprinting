-- Reporting Hours — Workday tech logo for Front Stage Tech and Back Stage Tech cells.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The tutor logs and submits tutoring hours in Workday by the deadline.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The PLUS Supervisor team reviews submitted hours and approves them in Workday.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0308';
