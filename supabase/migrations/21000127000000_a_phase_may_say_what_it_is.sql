-- A phase may say what it is.
--
-- The Phase panel (#357, slice 3) writes `phases.summary` directly, under the
-- signed-in author's own privileges. It could not: 20260729120000 revoked
-- UPDATE on `phases` from `authenticated` and re-granted exactly two columns,
-- `business_impact` and `operational_requirements`. The column was still
-- called `description` then; 21000108000000 renamed it to `summary` and, being
-- a rename, moved the word and not the grant — there was none to move. So the
-- one sentence the panel leads with was the one field a signed-in author
-- could not save. Found by replaying the whole series and asking
-- `has_column_privilege` for every column the five panels write; this was
-- the only refusal.
--
-- Nothing in the core changes. The grant is the recipe's business —
-- `authenticated` is a role only the recipe creates — so this file is recipe
-- from its first statement, and its proof is the one the panel's save asks:
-- can this role UPDATE this column. Additive; the schema version does not
-- move (the same stance as 21000126000000).

-- @recipe

grant update (summary) on public.phases to authenticated;

do $recipe_proof$
begin
  if not has_column_privilege('authenticated', 'public.phases', 'summary', 'UPDATE') then
    raise exception 'proof: authenticated cannot UPDATE public.phases.summary; the grant did not take';
  end if;
  -- The two the panel already wrote, still there: this file widens, it does
  -- not re-posture.
  if not has_column_privilege('authenticated', 'public.phases', 'business_impact', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.phases', 'operational_requirements', 'UPDATE') then
    raise exception 'proof: the phase panel''s existing columns lost their grant';
  end if;
end
$recipe_proof$;
