-- Call-off Request step 2: remove Back Stage Tech.

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000170208'
   or target_cell_id = 'a0000000-0000-4000-8000-000000170208';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000170208';
