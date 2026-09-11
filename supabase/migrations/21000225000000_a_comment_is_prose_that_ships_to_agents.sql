-- A comment is prose that ships to agents.
--
-- Authored 2026-09-10. The version is an allocation counter, not a date.
--
-- The agent-facing schema section is rendered from `pg_description` rather
-- than written a third time beside the catalog. PostgREST exposes
-- `pg_catalog` to no role — not anon, not service_role — so a generator
-- talking to the Data API has no way to read a comment under any key.
-- `schema_comments()` is that way: every table, view and column comment in
-- public, SECURITY INVOKER (the catalog is already readable; there is
-- nothing to escalate), granted to the roles a connected deployment's anon
-- key can hold.
--
-- A deployment with a database runs `npm run agent-account` to splice the
-- result into its account; with no database connected nothing is generated.
-- The function itself is core — any Postgres can answer it. Who may call it
-- over PostgREST is the recipe's.

-- @core

create or replace function public.schema_comments()
returns table (relation text, column_name text, comment text)
language sql
stable
set search_path = pg_catalog
as $$
  select c.relname::text,
         null,
         obj_description(c.oid, 'pg_class')
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'v', 'm')
     and obj_description(c.oid, 'pg_class') is not null
  union all
  select c.relname::text,
         a.attname::text,
         col_description(c.oid, a.attnum)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
   where n.nspname = 'public'
     and c.relkind in ('r', 'v', 'm')
     and col_description(c.oid, a.attnum) is not null
$$;

comment on function public.schema_comments() is
  'Every table, view and column comment in public. A comment is prose that ships to agents, so the agent-account generator renders the schema section from it rather than restating the catalog.';

do $proof$
declare
  v_rows integer;
begin
  select count(*) into v_rows from public.schema_comments();
  if v_rows = 0 then
    raise exception 'proof: schema_comments() returned no comment';
  end if;
end
$proof$;

-- @recipe — the grant names the Supabase roles. The function itself is core;
-- who may call it over PostgREST is this deployment's business.

grant execute on function public.schema_comments() to anon, authenticated, service_role;

do $proof$
begin
  if not has_function_privilege('anon', 'public.schema_comments()', 'execute') then
    raise exception 'proof: anon cannot execute schema_comments()';
  end if;
end
$proof$;
