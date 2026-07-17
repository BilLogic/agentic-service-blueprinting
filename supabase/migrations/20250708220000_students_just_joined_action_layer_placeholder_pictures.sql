-- Students Just Joined — placeholder pictures for Partner, Lead Tutor, and Regular Tutor cells

update public.cells
set picture = '/blueprint-images/shared/step-visual-placeholder.svg'
where path_id = 'a0000000-0000-4000-8000-00000000080b'
  and id in (
    'a0000000-0000-4000-8000-000000190101',
    'a0000000-0000-4000-8000-000000190201',
    'a0000000-0000-4000-8000-000000190301',
    'a0000000-0000-4000-8000-000000190102',
    'a0000000-0000-4000-8000-000000190202',
    'a0000000-0000-4000-8000-000000190302',
    'a0000000-0000-4000-8000-000000190303'
  );
