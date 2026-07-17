-- Reporting an Issue — placeholder pictures for Lead Tutor and Regular Tutor cells

update public.cells
set picture = '/blueprint-images/shared/step-visual-placeholder.svg'
where path_id = 'a0000000-0000-4000-8000-00000000080f'
  and id in (
    'a0000000-0000-4000-8000-0000001d0102',
    'a0000000-0000-4000-8000-0000001d0103',
    'a0000000-0000-4000-8000-0000001d0402',
    'a0000000-0000-4000-8000-0000001d0403'
  );
