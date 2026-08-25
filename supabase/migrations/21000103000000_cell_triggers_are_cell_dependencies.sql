-- cell_triggers → cell_dependencies. Written 2026-08-25.
--
-- Everything except the table already said dependency:
--
--   public.set_cell_dependency · public.clear_cell_dependency   the RPCs
--   'dependency_count'                                          deletion_impact
--   copy_dependencies                                           duplicate_path
--
-- WHAT DOES NOT CHANGE: the `kind` column keeps ('trigger', 'needs').
-- "trigger" there is not the container — it is one of two KINDS of dependency,
-- temporal ("sets this off") against functional ("must exist first"). Renaming
-- it would give kind in ('dependency', 'needs'), which is incoherent: `needs`
-- is a dependency too. A genus cannot also be one of its own species.
--
-- The FK constraint names are the load-bearing ones. PostgREST embed hints
-- name them as STRINGS, where nothing type-checks them on either side.

alter table public.cell_triggers rename to cell_dependencies;

select public.__rename_schema_objects('cell_triggers', 'cell_dependencies');

-- `cell_triggers` is an unambiguous identifier, so a word-boundary sweep is
-- safe here in a way it is not for `description`.
select public.__rewrite_function_bodies(
  array['\mcell_triggers\M'],
  array['cell_dependencies'],
  7
);

comment on table public.cell_dependencies is
  'Dependency from one cell to another. kind: trigger (temporal) | needs (functional).';

select public.__assert_vocabulary_gone(
  array['cell_trigger'],
  array['cell_triggers']
);
