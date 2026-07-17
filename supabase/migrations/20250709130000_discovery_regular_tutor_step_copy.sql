-- Discovery — Regular Tutor copy for steps 1–5 (happy + sad paths).

update public.cells
set content = 'Discovers PLUS via word of mouth.'
where id in (
  'a0000000-0000-4000-8000-000000070103',
  'a0000000-0000-4000-8000-000000720103'
);

update public.cells
set content = 'Discovers PLUS via social media.'
where id in (
  'a0000000-0000-4000-8000-000000070203',
  'a0000000-0000-4000-8000-000000720203'
);

update public.cells
set content = 'Discovers PLUS via PLUS marketing website.'
where id in (
  'a0000000-0000-4000-8000-000000070303',
  'a0000000-0000-4000-8000-000000720303'
);

update public.cells
set content = 'Discovers PLUS via on campus activities.'
where id in (
  'a0000000-0000-4000-8000-000000070403',
  'a0000000-0000-4000-8000-000000720403'
);

update public.cells
set content = 'Discovers PLUS via handshake.'
where id in (
  'a0000000-0000-4000-8000-000000070503',
  'a0000000-0000-4000-8000-000000720503'
);
