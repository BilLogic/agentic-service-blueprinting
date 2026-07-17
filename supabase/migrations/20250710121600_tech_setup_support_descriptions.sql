-- Tech Setup Happy Path — Support Actions descriptions (steps 1–5).

update public.cells
set description = 'Child protection laws require PLUS tutors to complete mandated background checks and clearances before working with students.'
where id in (
  'a0000000-0000-4000-8000-000000100109',
  'a0000000-0000-4000-8000-000000100209',
  'a0000000-0000-4000-8000-000000100309'
);

update public.cells
set description = 'Employment laws identity and employment eligibility verification prior to hiring.'
where id in (
  'a0000000-0000-4000-8000-000000100409',
  'a0000000-0000-4000-8000-000000100509'
);
