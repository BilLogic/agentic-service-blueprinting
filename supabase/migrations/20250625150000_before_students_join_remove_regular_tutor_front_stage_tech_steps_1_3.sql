-- Remove Regular Tutor → Front Stage Tech connections for steps 1–3 on Before Students Join happy path

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096041',
  'a0000000-0000-4000-8000-000000096042',
  'a0000000-0000-4000-8000-000000096043'
);
