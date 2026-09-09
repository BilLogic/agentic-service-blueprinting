-- A source carries one note.
--
-- `evidence` held three prose-ish columns — `ref`, `excerpt` and `note` — and
-- the form above them asked an author to sort a sentence into the right one
-- before writing it. Measured on the deployment that runs this template: of 66
-- rows, every one carries a title, two carry the quote field, and none carries
-- the reference field. The titles say where the references went instead
-- ("PR 1151", "Card 2266", "Metabase, 2026-08-08"), and one of the two quotes
-- is not a quote but a note about a meeting, sitting in a field whose
-- placeholder reads "Their words, not a summary of them".
--
-- Zero rows means UNUSED, not unreachable: the agent's `create_evidence` could
-- write `ref` the whole time and never did. So the count is evidence about the
-- field, not about the surface.
--
-- `note` survives as the one general-purpose prose column. A quote is one thing
-- an author might put in it, an observation is another, and a URL is a third —
-- a URL written inside a note renders as a link wherever a source is displayed,
-- which is the whole job `ref` was carrying for the rows that never used it.
--
-- ── Why one column is dropped and the other is folded first ────────────────
--
-- `excerpt` and `note` mean the same thing at different widths, so an excerpt
-- has somewhere to go and is moved there. `ref` does not: a locator is not
-- prose, and this migration will not invent a sentence around "PR 1151". A
-- row that still carries one stops the migration instead, and the fix is to
-- fold the locator into the note by hand and run again.
--
-- ── The word `note` survives the promotion ────────────────────────────────
--
-- `21000116000000` set one word per meaning — a `name` is navigated by, a
-- `title` is authored, a `summary` is the thing's own sentence, a `note` is an
-- aside — and then deliberately spared `evidence.note` on the argument that a
-- source's note is an aside beside the source. Three months of authoring says
-- the aside was doing the work and the field beside it was not. So this keeps
-- the word rather than renaming to `summary`: `summary` is the thing's OWN
-- sentence, and a note about a source is still not the source. What changes is
-- that it is now the only prose there is, which is a fold rather than a licence
-- — `findings.summary` is still a summary, and the next column whose job is a
-- thing's own sentence still gets that word.
--
-- ── The assertions are invariants, not censuses ────────────────────────────
--
-- Neither guard counts rows. "No excerpt is destroyed" and "no reference is
-- destroyed" are true of every database this file will ever meet, including an
-- empty one — which is the only kind of assertion that can replay. A guard
-- that named a number would be true of one database on one day and would make
-- this file unable to run anywhere else.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- 21000113000000 wrote `evidence.ref` when it split `cells.links`, from the
-- provenance citations that column held. On an empty replay there are no cells
-- and therefore no citations, so both guards pass and both columns go. On a
-- database that carried citations, the reference guard is exactly the stop it
-- is there to be.
--
-- No grant moves. `evidence` is granted whole-table (20260730090000,
-- 20260818000000), never column by column, so removing two columns removes
-- nothing anybody was given. No function body reads either column: the only
-- SQL that ever named `ref` is 21000113000000's own one-time insert and its
-- own guard, both of which run before this file and are unaffected by it.

-- @core

-- ---------------------------------------------------------------------------
-- 1. Every excerpt reaches the note
-- ---------------------------------------------------------------------------

update public.evidence
   set note = excerpt
 where excerpt is not null
   and note is null;

do $$
declare
  stranded bigint;
begin
  -- What is left is the rows that carried BOTH, where the two are not the same
  -- sentence. The migration cannot choose between them and will not concatenate
  -- them into a shape their author did not write.
  select count(*) into stranded
    from public.evidence
   where excerpt is not null
     and btrim(excerpt) is distinct from btrim(coalesce(note, ''));
  if stranded <> 0 then
    raise exception '% evidence row(s) carry both an excerpt and a different note. Merge each pair into the note, then run this migration again — it will not join two sentences on its author''s behalf.', stranded;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. No reference is destroyed
-- ---------------------------------------------------------------------------

do $$
declare
  located bigint;
begin
  select count(*) into located
    from public.evidence
   where nullif(btrim(ref), '') is not null;
  if located <> 0 then
    raise exception '% evidence row(s) carry a reference. A locator is not prose and this migration will not invent a sentence around one — fold each into the row''s note, then run it again.', located;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. The columns
-- ---------------------------------------------------------------------------

alter table public.evidence
  drop column ref,
  drop column excerpt;

comment on column public.evidence.note is
  'The one thing worth keeping about this source, in the author''s own words: '
  'a quotation, an observation, or a link. A URL written here renders as a '
  'link wherever the source is displayed.';

comment on table public.evidence is
  'Provenance rows for cells and proposition questions. A cell with zero rows '
  'is an ASSUMPTION (derived, never stored). Restricted SELECT: a note may '
  'hold interview content.';

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'evidence'
       and column_name in ('ref', 'excerpt')
  ) then
    raise exception 'evidence still carries ref or excerpt';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'evidence'
       and column_name = 'note'
  ) then
    raise exception 'evidence has no note — the prose landed nowhere';
  end if;

  -- `drop column` refuses when a view or an index depends on the column and
  -- says NOTHING about a function body, which is what makes this the sweep
  -- worth running rather than the one the DDL already did. Nothing in `public`
  -- reads either column today; a body added later that does would raise 42703
  -- when called, and this is where it says so instead.
  --
  -- `excerpt` is taken bare because the word appears nowhere else in this
  -- schema. `ref` cannot be — it is a fragment of half the identifiers in
  -- Postgres — so it is taken only inside a body that also names `evidence`,
  -- which is as narrow as a text sweep can honestly be.
  select count(*) into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind in ('f', 'p')
     and (p.prosrc ~ '\mexcerpt\M'
          or (p.prosrc ~ '\mevidence\M' and p.prosrc ~ '\mref\M'));
  if bad <> 0 then
    raise exception '% functions still read evidence.ref or .excerpt', bad;
  end if;
end
$proof$;
