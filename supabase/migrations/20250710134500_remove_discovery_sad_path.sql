-- Remove Discovery Sad Path from the database.
-- Cascades remove layers, cells, path_steps, and cell_triggers for this path.
-- Also drops the sad-path-only final step.

delete from public.paths
where id = 'a0000000-0000-4000-8000-000000000701';

delete from public.steps
where id = 'a0000000-0000-4000-8000-000000000717'
  and not exists (
    select 1 from public.path_steps ps where ps.step_id = 'a0000000-0000-4000-8000-000000000717'
  );
