-- What the migrations actually built: the shape of every public table AND
-- every closed vocabulary, as `kind<TAB>subject<TAB>member` rows.
--
-- Run with `psql -At -F $'\t' -f` so the output is exactly that and nothing
-- else. Views are excluded on purpose: the reference snapshot describes them
-- separately, and a view's columns are a projection rather than a shape a
-- replacement backend has to carry.
--
-- THE ROWS CARRY THEIR KIND IN THE FIRST FIELD. They used to be
-- `table<TAB>column` and nothing else, and the vocabularies — the CHECK
-- constraints that close `paths.kind`, `lanes.lane_role`, the `entity_status`
-- domain — were outside the inventory entirely, so a value added to a
-- constraint reached neither of this file's two readers. Both of them read a
-- row field by field, which is why the kind is a LEADING COLUMN rather than a
-- row shape to be told apart by how many fields it has: a shape that means one
-- thing at two fields and another at three is a shape the next kind added here
-- changes silently, in a file whose whole job is to be diffed.
--
--   column<TAB>cells<TAB>status        a column of a public base table
--   enum<TAB>entity_status<TAB>live    a member a public domain's CHECK accepts
--   enum<TAB>paths.kind<TAB>happy      a member a column's own CHECK accepts
--
-- The subject of an enum row is the domain's name, or `table.column` for a
-- column constraint. The two cannot collide: a domain name is one identifier
-- and carries no dot.
--
-- Only the `x = ANY (ARRAY['a'::text, …])` shape is read, because that is the
-- one shape that states a vocabulary as a list — the same shape
-- `scripts/generate-database-types.mjs` derives the enum unions from. A range
-- check or a cross-column invariant is a rule and not a vocabulary, and is
-- left out rather than half-parsed.
with column_checks as (
  select
    t.relname || '.' || a.attname as subject,
    substring(pg_get_constraintdef(c.oid) from 'ANY \(ARRAY\[([^\]]*)\]\)') as members
  from pg_constraint c
  join pg_class t
    on t.oid = c.conrelid
   and t.relnamespace = 'public'::regnamespace
   and t.relkind = 'r'
  join pg_attribute a
    on a.attrelid = t.oid
   and a.attnum = c.conkey[1]
  where c.contype = 'c'
    and array_length(c.conkey, 1) = 1
),
domain_checks as (
  select
    d.typname as subject,
    substring(pg_get_constraintdef(c.oid) from 'ANY \(ARRAY\[([^\]]*)\]\)') as members
  from pg_constraint c
  join pg_type d
    on d.oid = c.contypid
   and d.typnamespace = 'public'::regnamespace
   and d.typtype = 'd'
  where c.contype = 'c'
),
vocabularies as (
  select subject, members from column_checks where members is not null
  union all
  select subject, members from domain_checks where members is not null
)
select kind, subject, member from (
  select 'column' as kind, c.table_name as subject, c.column_name as member
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema
   and t.table_name = c.table_name
  where c.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
  union all
  -- The members, one row each: every `'…'::text` literal inside the ARRAY, with
  -- a doubled quote inside a member put back the way psql wrote it.
  select 'enum', v.subject, replace(m.captured[1], $q$''$q$, $q$'$q$)
  from vocabularies v
  cross join lateral regexp_matches(v.members, $q$'((?:[^']|'')*)'::text$q$, 'g') as m(captured)
) rows
order by kind, subject, member;
