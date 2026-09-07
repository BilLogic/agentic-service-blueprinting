-- A scenario says what runs beside it.
--
-- Authored 2026-09-06. The version is an allocation counter, not a date.
--
-- Some scenarios can run at the same time as each other, and a board that
-- says so says it in a sentence: "this scenario can run in parallel with the
-- goal-setting and help-request scenarios." A deployment built on this
-- template kept that sentence in a `Record<string, string>` keyed on hardcoded
-- scenario UUIDs, and read it twice — once onto the blueprint fallbacks, once
-- as a sidebar tooltip.
--
-- It is a per-scenario display value written in code, which is the class this
-- schema keeps moving out: the vocabulary and the per-scenario display flags
-- belong to the board, not to the build. A deployment whose scenarios do not
-- overlap gets somebody else's three sentences; a deployment that adds a
-- fourth overlapping scenario has to ship a TypeScript change to say so.
--
-- ── The note is a scenario's, and today it is written onto its paths ───────
--
-- `paths.note` already exists, and its own comment names this exact use:
-- "optional path note shown alongside path metadata (e.g. parallel scenario
-- context)". So the sentence has a home — the wrong one. Parallelism is a fact
-- about the SCENARIO, and a reader that keeps it on paths copies the same
-- string onto every path of it: a scenario's happy path and its alternate path
-- both carry the identical sentence. Two rows that must agree and nothing
-- making them, which is the shape a single column fixes.
--
-- `paths.note` is untouched. A path keeps its own note for what is true of
-- that route and not of its siblings; this column is for what is true of all
-- of them. A path note that merely repeats its scenario's is now redundant
-- rather than wrong, and clearing one is a data decision each deployment makes
-- about its own board.
--
-- ── Why `note` and not a flag ──────────────────────────────────────────────
--
-- The obvious alternative was a structured one — `parallel_with uuid[]`, and
-- let the renderer compose the sentence. It is the better model and it is not
-- this change. Composing that sentence means owning its grammar in every
-- language a deployment authors in ("with the goal-setting and help-request
-- scenarios" is an English list with an English conjunction), and the board's
-- names are already free-form and any language (see `lanes.name`,
-- `21000104000000`). A note the author writes is a note the author can write
-- correctly. The column is prose because the value is prose.
--
-- Naming it `note` rather than inventing a word is the rule `21000116000000`
-- settled: `summary` is the thing's own description, `note` is the aside
-- beside it, and `phases`, `paths` and `cells` already spell it that way. A
-- scenario's `summary` is what the scenario IS; this is what a reader should
-- know about it besides.
--
-- ── No new grant ───────────────────────────────────────────────────────────
--
-- `scenarios` already grants SELECT to anon and to authenticated at the table
-- level, so a new column is readable the moment it exists and nothing here
-- belongs to the recipe half. No UPDATE grant: `20260818000000` granted
-- `update` on exactly the three columns a panel writes — today `name`,
-- `summary` and `layout`, after the renames — and a fourth column joins that
-- list in the migration that brings the field which writes it.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- One additive column, nullable, no default beyond NULL, `if not exists` so a
-- re-run is a no-op. It replays clean against an empty database.
--
-- The proof is an INVARIANT, never a census: the column exists and is
-- nullable. Asserting that any scenario CARRIES a note would be a census —
-- true of one populated database on the day and false of every empty replay.

alter table public.scenarios
  add column if not exists note text;

comment on column public.scenarios.note is
  'An aside about the scenario, beside the summary that says what it is: most '
  'often what else may be running at the same time ("this scenario can run in '
  'parallel with goal setting and help requests"). Blueprint data, not app '
  'configuration — it replaces the Record keyed on hardcoded scenario ids that '
  'a deployment would otherwise keep in code. A scenario''s fact, held once, '
  'rather than the same sentence copied onto each of its paths through '
  'paths.note. Free prose in the author''s own language rather than a '
  'structured flag the renderer would have to compose a sentence from.';

do $proof$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'scenarios'
       and column_name = 'note'
  ) then
    raise exception
      'proof: scenarios.note did not take';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'scenarios'
       and column_name = 'note'
       and is_nullable = 'NO'
  ) then
    raise exception
      'proof: scenarios.note must be nullable — most scenarios have nothing to say beside their summary';
  end if;
end
$proof$;
