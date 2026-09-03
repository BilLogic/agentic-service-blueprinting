-- Every core kind carries a local example.
--
-- A definition popover teaches the generic concept — what a phase is, what a
-- lane is — but it cannot ground that concept in the reader's own service
-- without one of two bad outcomes: bake one deployment's content in as
-- everyone's, or show nothing concrete and leave the abstraction abstract. The
-- fix is an authored, free-text example for each of the six core kinds —
-- service, phase, scenario, path, step, lane — written once, per deployment,
-- and shown under the definition as its own section.
--
-- ── Why a column on `services`, and why jsonb ────────────────────────────
--
-- The set is small, fixed, per-service and never queried on its own, so it is
-- a single jsonb object on the service row rather than a child table. It rides
-- the service block of the blueprint source: the mapping skill authors it, the
-- seed generator emits it, and a re-map round-trips it, which is why this is
-- blueprint DATA on `services` and not app config in a file a re-map would
-- wipe.
--
-- The six keys are a fixed vocabulary the app owns, so there is deliberately
-- NO CHECK here. A constraint enumerating the keys would be a second place the
-- kind list lives, and it would reject a forward-compatible seventh key on the
-- day the app learned to write one. The column stays a plain jsonb object; the
-- shape is enforced where it is read.
--
-- Additive and non-breaking: default `{}` so the row that exists today, and
-- every deployment that has authored nothing yet, reads back an empty map and
-- renders no example. It applies before the read that consumes it merges.
--
-- ── Replaying against an empty database ──────────────────────────────────
--
-- One additive column with a default. The proof is an INVARIANT, never a
-- census: after the add every row has a non-null object default, which is
-- vacuously true on an empty replay and is the evidence on a live target that
-- the default took and no reader meets a null map.
--
-- The whole migration is portable core: a plain column on a plain table, with
-- no Supabase primitive named. The table-level select policy already covers a
-- new column, so there is no recipe fragment.

alter table public.services
  add column if not exists entity_examples jsonb not null default '{}'::jsonb;

comment on column public.services.entity_examples is
  'Per-service authored examples, one free-text value per core kind (service, phase, scenario, path, step, lane), shown under each kind''s definition to ground it in this deployment. Blueprint data, not app config: it rides the service block so a re-map round-trips it. A jsonb object with no CHECK — the six-key shape is the app''s, and an unwritten key simply does not render.';

do $proof$
declare
  v_nulls integer;
begin
  select count(*) into v_nulls
    from public.services
   where entity_examples is null;
  if v_nulls <> 0 then
    raise exception
      'proof: % service row(s) have a null entity_examples; the default did not take', v_nulls;
  end if;
end
$proof$;
