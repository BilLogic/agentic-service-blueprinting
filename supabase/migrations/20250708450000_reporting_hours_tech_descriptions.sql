-- Reporting Hours — tech descriptions for Workday and Bank cells.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The tutor logs and submits tutoring hours in Workday by the deadline.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The PLUS Supervisor team reviews submitted hours and approves them in Workday.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0208';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Bank',
    'description', 'The tutor receives their biweekly paycheck via direct deposit to their bank account.'
  )
)
where id = 'a0000000-0000-4000-8000-0000001e0306';
