-- Reporting Hours — placeholder pictures for Lead Tutor and Regular Tutor cells.

update public.cells
set picture = '/blueprint-images/shared/step-visual-placeholder.svg'
where path_id = 'a0000000-0000-4000-8000-000000000812'
  and id in (
    'a0000000-0000-4000-8000-0000001e0102',
    'a0000000-0000-4000-8000-0000001e0103',
    'a0000000-0000-4000-8000-0000001e0302',
    'a0000000-0000-4000-8000-0000001e0303'
  );
