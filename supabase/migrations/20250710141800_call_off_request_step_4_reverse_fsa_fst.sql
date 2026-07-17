-- Call-off Request step 4: reverse Front Stage Actions ↔ Front Stage Tech.

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000170404',
  target_cell_id = 'a0000000-0000-4000-8000-000000170406'
where id = 'a0000000-0000-4000-8000-000000095013';
