-- Fill-in Request step 1: reverse Back Stage Actions ↔ Back Stage Tech.

update public.cell_triggers
set
  source_cell_id = 'a0000000-0000-4000-8000-000000150107',
  target_cell_id = 'a0000000-0000-4000-8000-000000150108'
where id = 'a0000000-0000-4000-8000-000000094001';
