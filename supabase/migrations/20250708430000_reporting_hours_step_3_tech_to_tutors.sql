-- Reporting Hours — route step 3 tutor connections through Front Stage Tech (Bank).

update public.cell_triggers
set source_cell_id = 'a0000000-0000-4000-8000-0000001e0306'
where id in (
  'a0000000-0000-4000-8000-000000098081',
  'a0000000-0000-4000-8000-000000098083'
);
