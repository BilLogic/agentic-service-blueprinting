-- Session Sign Up step 1: remove Back Stage Actions ↔ Front Stage Tech triggers.

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000092001',
  'a0000000-0000-4000-8000-000000092002'
);
