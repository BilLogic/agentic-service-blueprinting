-- Tech Setup: update Employment laws support description (steps 4–5).

update public.cells
set description = 'Employment laws identity and employment eligibility verification upon hiring.'
where id in (
  'a0000000-0000-4000-8000-000000100409',
  'a0000000-0000-4000-8000-000000100509'
);
