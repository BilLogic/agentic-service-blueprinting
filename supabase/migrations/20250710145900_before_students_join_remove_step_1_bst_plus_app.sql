-- Before Students Join step 1: remove Back Stage Tech PLUS App and its triggers.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000096061',
  'a0000000-0000-4000-8000-000000096063'
);

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000180108';
