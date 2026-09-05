-- `slices_referencing` still reads `slice_items`, and every delete says so.
--
-- 21000115000000 renamed the table to `slides` and moved every dependent name
-- a catalogue can see — the four constraints, the two indexes, the trigger, the
-- four PERMISSIVE policies. It missed two things: the three RESTRICTIVE policies
-- the optional tier recipe had already created under the old name, and the one
-- kind of name no catalogue holds at all — the text a function body was created
-- with.
--
-- `slices_referencing` is `language sql`. A SQL body is stored verbatim and is
-- not re-resolved when a relation it names is renamed, so the function survived
-- the rename intact and fails on CALL:
--
--   select public.slices_referencing(array[]::uuid[]);
--   ERROR:  relation "public.slice_items" does not exist
--
-- `deletion_impact` reads it for `affected_slices`, and `delete_cell`,
-- `remove_lane`, `remove_lanes`, `remove_step`, `delete_path` and
-- `delete_scenario` all read `deletion_impact`. So no structural delete could
-- succeed at all on a database built from this series — the confirm dialog
-- raises 42P01 at the moment somebody is deleting something.
--
-- ── Why 21000115 did not catch it ─────────────────────────────────────────
--
-- It knew about bodies. It rewrote `duplicate_path` and `duplicate_scenario`
-- from `pg_get_functiondef`, and its proof swept those same two for the
-- retired COLUMN word. Both halves were scoped by name to the two functions
-- that copy `cells.picture`, because that is the rename that file was thinking
-- about; the TABLE rename in the same file got the catalogue pass and no body
-- pass at all. A sweep scoped to the functions you already suspect can only
-- confirm what you suspected — which is why the assertion added with this file
-- (`npm run check:function-bodies`) calls EVERY `language sql` function in
-- `public` rather than the ones a reader would think to name.
--
-- The deployment this template was generalised from hit the same defect in the
-- same rename and fixed it the same way — a `create or replace` per body, with
-- the moved names changed and nothing else — so this is that fix, on the two
-- occurrences this schema has.
--
-- ── The three policies the same rename left behind ────────────────────────
--
-- The catalogue pass 21000115 DID run was not complete either, and the sweep
-- that reads a built database is what says so rather than a reading of the
-- file. `20260818002000` — the OPTIONAL service-account tier, a recipe —
-- creates a RESTRICTIVE insert/update/delete policy per table from a
-- hand-written table list, and that list still read `slice_items`. So a
-- database that replays the whole series carries
-- `slice_items_insert_service_only`, `slice_items_update_service_only` and
-- `slice_items_delete_service_only` on `public.slides`: 21000115 moved the four
-- permissive policies it could name and never looked for the recipe's three.
--
-- They are RENAMED below rather than dropped and recreated. A rename keeps the
-- policy's definition byte-for-byte — same command, same roles, the same
-- `using` and `with check` expressions — and a recreate is an opportunity to
-- write a different policy while claiming to move one.
--
-- The rename is in the RECIPE half, and guarded by a catalogue lookup, because
-- only a replay ever holds the old names. The generated recipe follows the
-- core's renames through every fragment that predates them
-- (`scripts/generate-portable-core.mjs`), so on the two-halves database the
-- tier's loop already created all three as `slides_*_service_only` and there is
-- nothing to move. Both databases end on the same three names, which is what
-- the assertion after the loop states.
--
-- ── What changes, and what deliberately does not ──────────────────────────
--
-- The body below is the definition the schema dump holds, with
-- `public.slice_items` written `public.slides` in the two places it appears.
-- The signature, the return type, the `language sql stable` volatility and the
-- `search_path` are byte-for-byte what 20260818001000 created, because a
-- function that acquired a new posture while being repaired is a second change
-- hiding inside a fix.
--
-- The grant is untouched on purpose. `create or replace function` keeps the
-- object's ACL, so the recipe's `grant execute … to anon, authenticated` still
-- holds — and it has to be untouched here, because those roles exist only
-- where the Supabase recipe was applied and this half is the portable core.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- No table, column or row moves: the schema version does not advance (the
-- stance of 21000126000000 through 21000128000000). `create or replace` makes a
-- re-run of the body a no-op, and the policy rename asks the catalogue first,
-- so a second run finds nothing left to move. The proofs are invariants — no
-- body in `public` names the retired relation, no policy carries it, and the
-- two functions the defect disabled answer when called — and all three read the
-- same on an empty replay as on a populated target.

create or replace function public.slices_referencing(cell_ids uuid[])
returns jsonb
language sql stable
set search_path = public, pg_catalog, pg_temp
as $fn$
  select coalesce(jsonb_agg(entry), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'slice_id', s.id,
      'title', s.title,
      'cell_keys', (
        select coalesce(jsonb_agg(to_jsonb(c.cell_key)), '[]'::jsonb)
        from public.cells c
        where c.id = any($1)
          and exists (
            select 1 from public.slides i2
            where i2.slice_id = s.id and c.id = any(i2.cell_ids)
          )
      )
    ) as entry
    from public.slices s
    where exists (
      select 1 from public.slides i
      where i.slice_id = s.id and i.cell_ids && $1
    )
  ) rows;
$fn$;

do $$
declare
  v_named text;
  v_slices jsonb;
  v_impact jsonb;
begin
  -- Every body, not the ones a reader would think to name — this is the sweep
  -- 21000115 scoped to two functions and therefore could not have failed.
  select string_agg(p.proname, ', ' order by p.proname) into v_named
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and p.prosrc like '%slice_items%';

  if v_named is not null then
    raise exception
      'a function body still names public.slice_items, which is public.slides now: %',
      v_named;
  end if;

  -- Called, not read. A `language sql` body is text until something calls it,
  -- so the only assertion that can see this class of defect is a call — and
  -- both of these raised 42P01 before this file.
  select public.slices_referencing(array[]::uuid[]) into v_slices;
  if v_slices is null then
    raise exception 'slices_referencing returned null; it returns a jsonb array';
  end if;

  select public.deletion_impact('lane', gen_random_uuid()) into v_impact;
  if v_impact -> 'affected_slices' is null then
    raise exception 'deletion_impact no longer reports affected_slices';
  end if;
end
$$;

-- @recipe — the three policies belong to the optional service-account tier
-- (20260818002000), which is a recipe: they exist only on a database where that
-- migration was applied, so the statement that moves them belongs to that half.
--
-- Guarded, because the generated recipe already speaks the current vocabulary:
-- on the two-halves database the tier's loop created these three as
-- `slides_*_service_only` and there is nothing here to rename. Only a replay of
-- the series carries the old names, and `alter policy` has no `if exists`.
do $$
declare
  v_command text;
  v_old text;
  v_new text;
begin
  foreach v_command in array array['insert', 'update', 'delete'] loop
    v_old := 'slice_items_' || v_command || '_service_only';
    v_new := 'slides_' || v_command || '_service_only';

    if exists (
      select 1
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'slides'
         and p.polname = v_old
    ) then
      execute format('alter policy %I on public.slides rename to %I', v_old, v_new);
    end if;
  end loop;
end
$$;

do $$
declare
  v_stale text;
begin
  -- The invariant rather than a census: NO policy in `public` names the retired
  -- table. It reads the same on a replay, where three were just moved, as on
  -- the two halves, where there was never anything to move — and it fails on
  -- the next policy created from a list somebody forgot to update.
  select string_agg(p.polname, ', ' order by p.polname) into v_stale
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and p.polname like '%slice_items%';

  if v_stale is not null then
    raise exception
      'a policy still names public.slice_items, which is public.slides now: %',
      v_stale;
  end if;
end
$$;
