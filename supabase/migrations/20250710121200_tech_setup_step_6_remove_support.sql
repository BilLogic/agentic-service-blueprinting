-- Tech Setup step 6 — remove Support Actions cell.

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000100609'
   or target_cell_id = 'a0000000-0000-4000-8000-000000100609';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000100609';
