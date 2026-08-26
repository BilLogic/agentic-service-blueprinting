-- The IR can finally say `needs`, so the number changes. Written 2026-08-26.
--
-- NO DDL, deliberately. `cell_dependencies.kind check (kind in
-- ('trigger','needs'))` has been in this schema since 20260729120000 and the
-- app has read both kinds ever since. The half that could not express a needs
-- edge was the IR: `$defs.trigger` carried only `source` and `target` under
-- `additionalProperties: false`, so a needs edge was dropped on export and
-- could not survive a re-import. references/ir-schema.json 2026.08.26 gives
-- the edge an optional `kind`.
--
-- The number still moves here, because `schema_version` is ONE contract
-- version across both halves — an IR file, a workspace, and a live target all
-- state the same string, and src/lib/backend/schemaVersion.ts speaks a list of
-- them, not a range. A target left at 2026.08.25 stays supported and stays
-- correct: the columns are identical either way.

update public.schema_version
set version = '2026.08.26',
    applied_at = now();

do $do$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.26') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$do$;
