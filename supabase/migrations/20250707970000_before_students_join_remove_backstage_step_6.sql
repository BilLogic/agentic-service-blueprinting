-- Before Students Join — remove Back Stage Actions cell on step 6 (Distribute breakout list)

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-000000180607'
   or target_cell_id = 'a0000000-0000-4000-8000-000000180607';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000180607';
