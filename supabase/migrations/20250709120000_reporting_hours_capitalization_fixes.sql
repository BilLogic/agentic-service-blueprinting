-- Reporting Hours — sentence-case capitalization fixes.

update public.cells
set content = 'Report hours by week deadline'
where id in (
  'a0000000-0000-4000-8000-0000001e0102',
  'a0000000-0000-4000-8000-0000001e0103'
);

update public.cells
set content = 'PLUS supervisor team reviews and approves hours'
where id = 'a0000000-0000-4000-8000-0000001e0307';

update public.cells
set content = 'Receives biweekly paycheck'
where id in (
  'a0000000-0000-4000-8000-0000001e0202',
  'a0000000-0000-4000-8000-0000001e0203'
);

update public.cells
set links = jsonb_set(
  links,
  '{0,description}',
  to_jsonb('The PLUS supervisor team reviews submitted hours and approves them in Workday.'::text),
  false
)
where id = 'a0000000-0000-4000-8000-0000001e0308';
