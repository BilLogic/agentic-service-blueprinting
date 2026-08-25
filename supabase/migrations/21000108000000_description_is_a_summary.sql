-- description → summary, on the five tables that carry one. Written 2026-08-25.
--
--   services.summary · phases.summary · scenarios.summary
--   paths.summary    · cells.summary
--
-- The field answers "what is this, in one line", which is a summary. The panel
-- editor already labels it "Summary" above a column called `description`.
--
-- `slices.description` KEEPS ITS NAME and is asserted to keep it below. A
-- slice's description is prose the author writes about the slice, not a
-- one-line gloss of a row, and collapsing the two words would lose that.
--
-- THE AMBIGUITY: `description` is a word, not an identifier — five tables had
-- one, a sixth still does, and `tech_description` is a link TYPE inside
-- cells.links. Upstream replaced each fragment by name for exactly this
-- reason. Here a word-boundary sweep is provably safe instead, and the proof
-- is cheap: three function bodies name a description, every fragment in them
-- belongs to one of the five renamed columns, and `\mdescription\M` cannot
-- match inside `tech_description` because an underscore is a word character.
-- The count below is the assertion that this stayed true.

alter table public.services  rename column description to summary;
alter table public.phases    rename column description to summary;
alter table public.scenarios rename column description to summary;
alter table public.paths     rename column description to summary;
alter table public.cells     rename column description to summary;

select public.__rewrite_function_bodies(
  array['\mdescription\M'],
  array['summary'],
  3
);

comment on column public.paths.summary is 'Optional summary of what this path variant represents';
comment on column public.cells.summary is
  'Optional longer cell summary (detail panel, not grid label)';

select public.__assert_vocabulary_gone(
  array[]::text[],
  array['description'],
  array['slices.description']
);
