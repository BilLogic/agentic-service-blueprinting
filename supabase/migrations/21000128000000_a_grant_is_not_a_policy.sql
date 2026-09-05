-- A grant is not a policy, and the service was only ever granted.
--
-- 21000126000000 put `services.summary` and `services.entity_examples` on the
-- write surface, and the Service panel still cannot save either. The grant was
-- necessary and it was not sufficient: `public.services` has row level security
-- enabled and carries exactly one policy, `services_select`. Under RLS an
-- UPDATE with no matching policy does not error — it matches no row. So the
-- save returns 200 with an empty payload, `requireRowsWritten` reads the zero
-- and raises "That service no longer exists", and the author is told their
-- service was deleted when what actually happened is that nothing was ever
-- allowed to touch it.
--
-- ── Why this is the one table it happened to ──────────────────────────────
--
-- Every other table the panels write got its update policy the day it got its
-- column grants: `lanes` and `phases` from the derived layer, `steps`, `paths`
-- and `scenarios` in 20260818000000, `business_models` in the propositions
-- work, `stakeholders` in 21000125000000. `services` is the spine's root and
-- nothing had ever written it — the IR builds a service, it does not edit one —
-- so it was the only table that reached the panel era with a read policy and
-- nothing else. 21000126000000 saw the missing grant, which is the half that is
-- visible in a column list, and had no reason to look for the half that is not.
--
-- ── Why dev never saw it ──────────────────────────────────────────────────
--
-- Local authoring signs in with `VITE_SUPABASE_DEV_SERVICE_KEY`, and
-- `service_role` bypasses row level security outright. The panel saved on every
-- laptop it was built on. It is the deployed, signed-in author — the only
-- caller RLS actually applies to — who is refused, which is the failure mode
-- this whole band keeps producing: a check that passes because the tester holds
-- a key no reader holds.
--
-- ── Shape ─────────────────────────────────────────────────────────────────
--
-- The same shape as `steps_update_auth` in 20260818000000, and for the same
-- reason: the column grant above it is what narrows the write, so the policy
-- says who and the grant says what. `using (true) with check (true)` is not a
-- widening — a signed-in author already writes `steps`, `paths`, `scenarios`
-- and `phases` on exactly these terms, and `services` is now consistent with
-- them rather than exceptional.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Recipe-only and additive: no table, no column, no row. The schema version
-- does not move (the same stance as 21000126000000 and 21000127000000). The
-- `drop policy if exists` makes a partial re-run idempotent. The proof is an
-- invariant — the policy is there, for `authenticated`, for UPDATE — and reads
-- the same on an empty replay as on a live target.

-- @recipe — a policy names `authenticated`, a role only the recipe creates.
-- Who may write a row is this deployment's enforcement of the contract, not
-- part of the contract; another host expresses the same rule its own way.

drop policy if exists "services_update_auth" on public.services;
create policy "services_update_auth" on public.services
  for update to authenticated using (true) with check (true);

-- The question the panel's save asks, asked here: is there an UPDATE policy on
-- `services` that a signed-in author is inside. Without one the save matches
-- zero rows and reports a deletion that never happened.
do $recipe_proof$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'services'
       and cmd = 'UPDATE'
       and 'authenticated' = any (roles)
  ) then
    raise exception 'proof: public.services has no UPDATE policy for authenticated; the grant is not a policy and the panel save would match zero rows';
  end if;
  -- The grant half, still there: this file adds the missing half, it does not
  -- re-posture the surface 21000126000000 named.
  if not has_column_privilege('authenticated', 'public.services', 'summary', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.services', 'entity_examples', 'UPDATE') then
    raise exception 'proof: the service panel''s columns lost their grant';
  end if;
end
$recipe_proof$;
