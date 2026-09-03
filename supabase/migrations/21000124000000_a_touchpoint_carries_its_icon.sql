-- A touchpoint carries its icon.
--
-- A well-known tool shows a stock logo in the detail panel — Zoom's mark, a
-- form's glyph. In the instance this template was generalised from, that logo
-- lived in CODE: a `Record<string, logo>` keyed on the tool's NAME ("Zoom",
-- "Slack", an app named after the deployment), read by a resolver that a
-- foreign tool fell straight through. A name-keyed map in the renderer is a
-- deployment's vocabulary wearing a code hat — the exact coupling this
-- convergence is unwinding (Decision D4: a value belongs in a row, not a hook).
--
-- A touchpoint is a thing the SERVICE owns (21000120000000), and its icon is a
-- property of the thing, authored once per (service, tool) — not per placement,
-- and never in the renderer. So it lands here, on the registry: one nullable
-- `icon_url`. The template ships it null and draws nothing; a deployment seeds
-- the URL of its own asset, and the generic panel reads it off the row. Zoom's
-- logo stops being a branch in a TypeScript file and becomes a string in a
-- column a re-map round-trips.
--
-- ── Replaying against an empty database ──────────────────────────────────
--
-- One additive column with no default beyond NULL. The proof is an INVARIANT,
-- never a census: the column exists and is nullable, which is vacuously true on
-- an empty replay and is the evidence on a live target that the add took and no
-- existing row was forced to carry a value it does not have.
--
-- The whole migration is portable core: a plain column on a plain table, no
-- Supabase primitive named. The table-level SELECT policy and grant from
-- 21000120000000 already cover a new column — anon reads it the moment it
-- exists — so there is no recipe fragment (the same stance as
-- 21000123000000).

alter table public.touchpoints
  add column if not exists icon_url text;

comment on column public.touchpoints.icon_url is
  'A stable URL for the touchpoint''s stock icon or logo — the mark a '
  'well-known tool shows in the detail panel. A property of the thing the '
  'service owns, authored once per (service, name), not per placement. Blueprint '
  'data, not app config: the template ships it null and draws nothing, and a '
  'deployment seeds its own asset URL. The renderer reads this row rather than '
  'matching a tool name against a table baked into code.';

do $proof$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'touchpoints'
       and column_name = 'icon_url'
  ) then
    raise exception 'proof: touchpoints.icon_url did not take';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'touchpoints'
       and column_name = 'icon_url'
       and is_nullable = 'NO'
  ) then
    raise exception 'proof: touchpoints.icon_url must be nullable — a touchpoint without a logo carries none';
  end if;
end
$proof$;
