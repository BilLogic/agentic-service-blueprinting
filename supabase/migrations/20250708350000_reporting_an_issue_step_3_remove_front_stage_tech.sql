-- Reporting an Issue step 3 — remove Front Stage Tech (Slack, Email).

delete from public.cell_triggers
where source_cell_id = 'a0000000-0000-4000-8000-0000001d0306'
   or target_cell_id = 'a0000000-0000-4000-8000-0000001d0306';

delete from public.cells
where id = 'a0000000-0000-4000-8000-0000001d0306';
