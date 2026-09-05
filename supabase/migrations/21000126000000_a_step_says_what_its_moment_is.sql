-- A step says what its moment is, and the service panel may write its own.
--
-- One column and three grants, all for the same reason (#357, alongside
-- 21000125000000): the panel editors that follow write these fields DIRECTLY,
-- under the caller's own privileges rather than through a definer function, so
-- a field that is not on the write surface refuses the save no matter how good
-- the form above it looks.
--
-- ── The column ────────────────────────────────────────────────────────────
--
-- A step is the only level a reader scans horizontally and has nothing to
-- read: it owns exactly one column, `name`. The column under it holds five
-- lanes' worth of cells and not one sentence saying what the moment as a whole
-- IS.
--
-- The first instinct is to put that sentence in the storyboard lane's cell —
-- the row already exists, in every path, at a real grid position. It does not
-- work. A storyboard cell's face comes from its frames, so a cell with no
-- picture does not render, is therefore not clickable, and the cell panel
-- cannot reach it. The sentence would land in exactly the place this effort
-- exists to remove: a filled field with no front door.
--
-- Step identity is clean, which makes the column cheap. `steps` holds one row
-- per step, keyed on `scenario_id`; `path_steps` only positions it. No
-- fan-out, no drift, and it covers every step rather than the subset that
-- happens to carry a frame today. It renders as the caption under the
-- storyboard frame, which is step-grained already.
--
-- ── The grants ────────────────────────────────────────────────────────────
--
-- `services.summary` and `services.entity_examples` are content columns the
-- Service panel writes in place. No key rides in either, so granting UPDATE on
-- them moves no row anywhere — it is the same kind of grant `cells.summary`
-- has held since the authoring foundation.
--
-- Neither has ever been named on the write surface. `services` is the one
-- spine table that was never revoked and re-granted column by column, so on a
-- host whose platform hands `authenticated` a table's whole UPDATE at creation
-- the panel happened to work, and on the portable core — where nothing hands
-- out anything — it did not. Naming the two columns makes the surface the same
-- shape on both, and says out loud which two of the service's fields a
-- signed-in author may write. Nothing is revoked here: a host that already
-- granted more keeps it, and this file's job is to guarantee the floor, not to
-- re-posture a table it did not narrow.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- One nullable column and three grants. Every one is additive, so no row is
-- touched and the schema version does not move — this changes what a target
-- CAN hold, not the shape of what the IR authors (the same stance as
-- 21000123000000, 21000124000000, 21000125000000). The column add is guarded
-- with `if not exists` because it is the one statement here a partial re-run
-- could repeat.
--
-- There are TWO proofs because the halves answer different questions. The
-- core's: the column exists and is nullable — a step nobody has described yet
-- is the ordinary case, not an error. The recipe's: `authenticated` can UPDATE
-- each of the three columns. That second question can only be asked where
-- `authenticated` exists, which is the recipe's business; asking it in the
-- core would make the portable core name the host it exists to be independent
-- of. Both are invariants, never censuses, and both read the same on an empty
-- replay as on a live target.

-- @core

-- ---------------------------------------------------------------------------
-- 1. What the moment is
-- ---------------------------------------------------------------------------

alter table public.steps add column if not exists summary text;

comment on column public.steps.summary is
  'What this moment is, across every lane — the one sentence that makes the '
  'column legible without reading five cells. Shown as the caption on the '
  'storyboard frame. Null until an author writes it.';

-- ---------------------------------------------------------------------------
-- Proof — the column, as an invariant
-- ---------------------------------------------------------------------------

do $proof$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name = 'steps'
                    and column_name = 'summary'
                    and is_nullable = 'YES') then
    raise exception 'proof: steps.summary must exist and be nullable — a step nobody has described yet is the ordinary case';
  end if;
  if (select data_type from information_schema.columns
       where table_schema = 'public'
         and table_name = 'steps'
         and column_name = 'summary') is distinct from 'text' then
    raise exception 'proof: steps.summary is not text — the caption is prose, not a key';
  end if;
end
$proof$;

-- @recipe — the write surface is the Supabase roles' business: `authenticated`
-- is a role only the recipe creates, and a column grant is how this deployment
-- says which fields a signed-in author may write directly.

-- The step's caption. `steps` was revoked and re-granted column by column in
-- 20260818000000, so its column grants ARE the surface and a new field has to
-- be named or the panel's save is refused.
grant update (summary) on public.steps to authenticated;

-- The Service panel's two fields. `services` was never narrowed, so this adds
-- a floor rather than replacing a posture — see the header.
grant update (summary, entity_examples) on public.services to authenticated;

-- The three columns the panels write, each reachable by the signed-in role.
-- An invariant: it reads the same on a database where the grant was already
-- wider as on one where this file is what put it there.
do $recipe_proof$
declare
  target text;
begin
  foreach target in array array[
    'steps.summary',
    'services.summary',
    'services.entity_examples'
  ] loop
    if not has_column_privilege(
      'authenticated',
      format('public.%I', split_part(target, '.', 1)),
      split_part(target, '.', 2),
      'UPDATE'
    ) then
      raise exception 'proof: authenticated cannot UPDATE public.%; the grant did not take', target;
    end if;
  end loop;
end
$recipe_proof$;
