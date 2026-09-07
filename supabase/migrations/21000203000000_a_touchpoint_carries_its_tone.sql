-- A touchpoint carries its tone.
--
-- Authored 2026-09-06. The version is an allocation counter, not a date.
--
-- `src/lib/touchpointColors.ts` holds a literal mapping a tool's NAME to the
-- colour family its face is drawn in: `Zoom` is indigo, `Notion` is gold. The
-- file's own header has said since it was written that this is a stopgap — "a
-- touchpoint's colour is meant to be chosen by whoever owns the blueprint",
-- and there was nowhere to store it because a touchpoint was then a substring
-- parsed out of `cells.content` with no row to hang anything on. There has
-- been a row since `21000120000000`, and a deployment-owned one since
-- `21000131000000`. This is the column.
--
-- ── Why a map in code cannot be the answer ─────────────────────────────────
--
-- The literal is a template's guess at what an adopter's tools are called, and
-- it is only ever right about the handful any service might use. A deployment
-- built on this template has its own twenty: an internal app, a campus system,
-- a partner's employer portal. None of those can be shipped upstream without
-- putting one adopter's vocabulary in every other adopter's build, so the
-- MACHINERY stays shared — alias resolution, case folding, the deterministic
-- fallback for a name the map does not carry — and the VALUES become each
-- deployment's, sourced from a column rather than from code. Without this
-- column `touchpointColors.ts` is a file every adopter has to fork.
--
-- ── Why `tone`, and why no CHECK constraint ────────────────────────────────
--
-- `tone` is the word the code already uses: `TouchpointTone` in
-- `src/lib/blueprintCellStyle.ts`, `data-blueprint-tone` on the rendered face.
-- Naming the column anything else would mint a second word for one thing,
-- which is the failure `21000116000000` swept the schema for.
--
-- The value names a palette FAMILY — `crimson`, `gold`, `indigo`, `purple`,
-- `red`, `tomato`, `yellow` — and not a colour. Which step of that family a
-- face is painted at is the renderer's decision and stays there.
--
-- No CHECK constraint enumerates those seven, deliberately. The tone
-- vocabulary belongs to the token model, which ADR 0006 makes the single style
-- seam. A CHECK here would be a second copy of that list, in a place no test
-- reads, free to drift from the one the renderer compiles against — and a
-- deployment that adds an eighth family would have to ship a migration to use
-- a colour. The column stores what the author chose; the renderer decides what
-- it can draw, and falls back deterministically for anything it does not know,
-- exactly as it already does for a tool the map never named.
--
-- ── No new grant ───────────────────────────────────────────────────────────
--
-- The registry's table-level SELECT policy and grant, written in
-- `21000120000000`, already cover a new column, so nothing here belongs to the
-- recipe half and the file is entirely core. No UPDATE grant either:
-- `authenticated` is granted UPDATE per column, and the column an editing
-- surface writes gets its grant in the migration that brings that surface —
-- `21000127000000` is the shape.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- One additive column, nullable, no default beyond NULL, `if not exists` so a
-- re-run is a no-op. It replays clean against an empty database.
--
-- The proof is an INVARIANT, never a census: the column exists and is
-- nullable. Nullable is load-bearing rather than incidental — null means the
-- author expressed no preference, and that is the state every existing row is
-- in, so a NOT NULL column would either fail the add or invent a default
-- colour for tools nobody had chosen one for.

alter table public.touchpoints
  add column if not exists tone text;

comment on column public.touchpoints.tone is
  'The palette family this touchpoint''s face is drawn in — the deployment''s '
  'own choice, one of the renderer''s tone names (crimson, gold, indigo, '
  'purple, red, tomato, yellow). A product fact ("our scheduling tool is '
  'blue"), not a styling one, which is why it is a row and not a literal in '
  'touchpointColors.ts. Deliberately unconstrained: the tone vocabulary '
  'belongs to the token model (ADR 0006) and a CHECK here would be a second '
  'copy of it, free to drift. Null means no preference — the renderer falls '
  'back deterministically, exactly as it does for a tool the seed map never '
  'named.';

do $proof$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'touchpoints'
       and column_name = 'tone'
  ) then
    raise exception
      'proof: touchpoints.tone did not take';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'touchpoints'
       and column_name = 'tone'
       and is_nullable = 'NO'
  ) then
    raise exception
      'proof: touchpoints.tone must be nullable — null is "the author chose no colour", which is what every existing row means';
  end if;
end
$proof$;
