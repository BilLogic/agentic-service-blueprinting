-- Derived-layer follow-up hardening (data-integrity review findings F1, F3, F4, F5).
-- F1: explicit Data API grants (plan 002 §1d) — stop relying on legacy default ACLs
--     that also left anon holding write privileges RLS was silently covering for.
-- F3: pin search_path on trigger/util functions (advisor WARN).
-- F4: attribution columns missed on slice_items/propositions.
-- F5: evidence cell_key XOR tightened to bidirectional pairing.

-- ---- F1: explicit exposure grants ----
grant select on public.slices, public.slice_items, public.findings to anon, authenticated;
grant select on public.evidence, public.propositions to authenticated;
grant insert, update, delete on public.slices, public.slice_items, public.evidence to authenticated;
grant insert, update on public.propositions to authenticated;
grant select on public.evidence_counts to anon, authenticated;

-- Defense-in-depth: strip legacy write privileges from anon (RLS already blocks the
-- DML, but TRUNCATE is not subject to RLS) and TRUNCATE from both roles everywhere.
revoke insert, update, delete, truncate on public.slices, public.slice_items,
  public.findings, public.evidence, public.propositions from anon;
revoke select on public.evidence, public.propositions from anon;
revoke truncate on public.slices, public.slice_items, public.findings,
  public.evidence, public.propositions, public.cells, public.layers, public.phases
  from anon, authenticated;
revoke insert, update, delete on public.evidence_counts from anon, authenticated;

-- ---- F3: pinned search_path on functions ----
alter function public.set_updated_at() set search_path = pg_catalog, pg_temp;
alter function public.cells_validate_path_match() set search_path = public, pg_catalog, pg_temp;

-- ---- F4: attribution on the remaining human-writable derived tables ----
alter table public.slice_items add column created_by uuid default auth.uid();
alter table public.propositions add column created_by uuid default auth.uid();
comment on column public.slice_items.created_by is 'auth.uid() at insert; null for service-key writes.';
comment on column public.propositions.created_by is 'auth.uid() at insert; null for service-key writes.';

-- ---- F5: evidence cell_key pairing is bidirectional ----
update public.evidence set cell_key = null where cell_id is null and cell_key is not null;
alter table public.evidence
  drop constraint evidence_cell_key_paired,
  add constraint evidence_cell_key_paired check ((cell_id is null) = (cell_key is null));

-- Accepted-by-design (documented, no change): evidence_counts is an owner-rights view
-- (advisor ERROR) — deliberately bypasses evidence RLS to expose counts only; making it
-- security_invoker would break the anonymous assumption-lens read. Public-bucket SELECT
-- policy on storage.objects is required for upsert overwrites. Findings reopen
-- collisions surface as 23505 by design (partial unique index).
