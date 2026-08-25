-- The shape changed, so the number changes. Written 2026-08-25.
--
-- Ten renames landed above. A target carrying 2026.07.16 and a target carrying
-- this one disagree about the name of nearly every table an IR touches, and
-- the adapter contract's compatibility check is the thing that has to notice.
-- src/lib/backend/schemaVersion.ts holds the matching supported list.
--
-- The scaffolding goes with them. __rewrite_function_bodies and its two
-- companions exist for one vocabulary change; leaving a catalog-rewriting
-- SECURITY INVOKER function in the schema afterwards would be leaving a loaded
-- tool on the bench.

update public.schema_version
set version = '2026.08.25',
    applied_at = now();

do $do$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.25') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$do$;

drop function public.__rewrite_function_bodies(text[], text[], integer);
drop function public.__rename_schema_objects(text, text);
drop function public.__assert_vocabulary_gone(text[], text[], text[]);
