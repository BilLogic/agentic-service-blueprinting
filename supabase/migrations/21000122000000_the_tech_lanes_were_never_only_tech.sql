-- The tech lanes were never only tech, and a lane role is a closed set.
--
-- `lane_role` was the one classifier column in this schema with no CHECK.
-- Every sibling has one — `paths.kind`, `scenarios.layout`, `slices.kind`,
-- five `origin` columns, the `resources` and `cell_touchpoints` kinds — so a
-- lane role could drift to any spelling and nothing would report it. This
-- closes it, and in closing it finishes three renames the data layer had
-- already begun to make at the render layer:
--
--   frontstage_tech      → frontstage_touchpoints
--   backstage_tech       → backstage_touchpoints
--   visual               → storyboard
--
-- ── Why the tech lanes become touchpoints ──────────────────────────────────
--
-- A "tech" lane never held only software. It held the things a moment happens
-- THROUGH — an app, a document, a channel, a place — which is exactly a
-- touchpoint. `cell_touchpoints` already carries them under that name; the
-- lane the customer or staff meets them in is a touchpoints lane.
--
-- ── The support split ──────────────────────────────────────────────────────
--
-- `support_systems` did two jobs at once: back-office PEOPLE (the teams and
-- vendors behind the work) and back-office SYSTEMS (the tools they run). The
-- people are `support_actions`; the systems are touchpoints like any other.
-- Every `support_systems` lane in this template is a systems lane — reference
-- material and guardrails the service rests on — so each becomes
-- `backstage_touchpoints`, and its cells keep the stacked, per-item face they
-- already wore. `support_actions` enters the vocabulary for the people lane an
-- adopter may add, and `partner_actions` for a party outside the service.
--
-- ── Why the set is closed, and what a role outside it becomes ───────────────
--
-- A custom role is no longer allowed — an unconstrained column is how a lane
-- goes unclassified, and the divider lines are drawn from the role, so an
-- unrecognised one draws nothing. `step_visual` never named a lane here (a
-- step never carried its own storyboard variation), so it is retired unused.
-- Any lane still carrying a role outside the eight — a `stakeholders`
-- swimlane, an adopter's own word — is set to null, which is a generic
-- swimlane and is exactly how such a lane already rendered: no role style, no
-- divider anchored on it. Null stays legal on purpose, for the actor lanes
-- that carry a person's name and no blueprint role.
--
-- ── Replaying against an empty database ─────────────────────────────────────
--
-- Every rename is an idempotent UPDATE over whatever rows exist, vacuous on
-- zero lanes; the constraint validates every existing row as it is added, so a
-- bad role aborts the migration rather than reaching the proof. The proof is
-- an INVARIANT — the constraint admits exactly the eight, and no lane holds a
-- role outside them — never a census.

-- @core

-- ---------------------------------------------------------------------------
-- 1. The renames, then the roles the closed set does not admit
-- ---------------------------------------------------------------------------

update public.lanes set lane_role = 'frontstage_touchpoints'
 where lane_role = 'frontstage_tech';
update public.lanes set lane_role = 'backstage_touchpoints'
 where lane_role = 'backstage_tech';
update public.lanes set lane_role = 'storyboard'
 where lane_role = 'visual';

-- A back-office system is a touchpoint. Every support_systems lane here is one.
update public.lanes set lane_role = 'backstage_touchpoints'
 where lane_role = 'support_systems';

-- Anything still outside the eight — a custom role, a retired one — is a
-- generic swimlane. This is what makes the ADD CONSTRAINT below succeed on
-- data that predates the closed vocabulary, and it changes no rendering: a
-- role with no style and no divider already drew as a plain swimlane.
update public.lanes set lane_role = null
 where lane_role is not null
   and lane_role not in (
     'customer_actions',
     'frontstage_actions',
     'backstage_actions',
     'partner_actions',
     'frontstage_touchpoints',
     'backstage_touchpoints',
     'support_actions',
     'storyboard'
   );

-- ---------------------------------------------------------------------------
-- 2. The closed constraint
-- ---------------------------------------------------------------------------
--
-- `is null or in (...)` rather than a bare `in (...)`: a NULL inside `in`
-- evaluates to NULL, which a CHECK treats as satisfied, so the bare form would
-- permit NULL by accident rather than on purpose. Null is a decision here — an
-- actor lane carries no blueprint role — and the next person tightening this
-- needs to see that.

alter table public.lanes
  drop constraint if exists lanes_lane_role_check;

alter table public.lanes
  add constraint lanes_lane_role_check
  check (
    lane_role is null
    or lane_role in (
      'customer_actions',
      'frontstage_actions',
      'backstage_actions',
      'partner_actions',
      'frontstage_touchpoints',
      'backstage_touchpoints',
      'support_actions',
      'storyboard'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. The bearing check inside sync_cell_touchpoints
-- ---------------------------------------------------------------------------
--
-- The sync files a cell's text in the touchpoint registry only when the lane
-- is a touchpoints lane (or the cell already holds a placement). It named the
-- old roles; it must name the new ones, or a touchpoints lane's edits stop
-- reaching the registry. Rewritten from its own current definition so the rest
-- of the body — every line this migration does not touch — carries across
-- unchanged.

do $rewrite$
declare
  after text;
begin
  after := pg_get_functiondef('public.sync_cell_touchpoints(uuid, text[])'::regprocedure);
  after := replace(
    after,
    'v_lane_role in (''frontstage_tech'', ''backstage_tech'', ''support_systems'')',
    'v_lane_role in (''frontstage_touchpoints'', ''backstage_touchpoints'')'
  );
  if after ~ '''frontstage_tech''' or after !~ '''frontstage_touchpoints''' then
    raise exception 'sync_cell_touchpoints still names the retired touchpoints roles';
  end if;
  execute after;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- 4. Say what the roles are, where the schema keeps its prose
-- ---------------------------------------------------------------------------
--
-- The column comment is a second list, and `check-retired-identifiers.mjs`
-- treats pg_description as a trusted prose surface — leaving it naming
-- `frontstage_tech` and `support_systems` would be the same drift this
-- migration exists to close, one layer down.

comment on column public.lanes.lane_role is
  'Semantic role key that drives rendering (touchpoint cells, storyboard rows, '
  'divider-line anchoring); the display name stays in lanes.name and is '
  'free-form in any language. Canonical values: customer_actions, '
  'frontstage_actions, backstage_actions, partner_actions, '
  'frontstage_touchpoints, backstage_touchpoints, support_actions, storyboard. '
  'Null = generic swimlane (e.g. actor lanes), and is permitted on purpose. '
  'Constrained by lanes_lane_role_check — a custom role is not allowed, '
  'because an unconstrained column is how a lane goes unclassified.';

-- @core

-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.08',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.08') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  def text;
  bad int;
begin
  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
   where c.conrelid = 'public.lanes'::regclass
     and c.conname = 'lanes_lane_role_check';
  if def is null then
    raise exception 'lanes_lane_role_check is missing';
  end if;
  if def ~ 'frontstage_tech' or def ~ 'backstage_tech'
     or def ~ 'support_systems' or def ~ '''visual''' or def ~ 'step_visual' then
    raise exception 'lanes_lane_role_check still admits a retired role: %', def;
  end if;
  foreach def in array array[
    'customer_actions', 'frontstage_actions', 'backstage_actions',
    'partner_actions', 'frontstage_touchpoints', 'backstage_touchpoints',
    'support_actions', 'storyboard'
  ] loop
    if pg_get_constraintdef((
         select c.oid from pg_constraint c
          where c.conrelid = 'public.lanes'::regclass
            and c.conname = 'lanes_lane_role_check'
       )) !~ def then
      raise exception 'lanes_lane_role_check does not admit %', def;
    end if;
  end loop;

  select count(*) into bad from public.lanes
   where lane_role is not null
     and lane_role not in (
       'customer_actions', 'frontstage_actions', 'backstage_actions',
       'partner_actions', 'frontstage_touchpoints', 'backstage_touchpoints',
       'support_actions', 'storyboard'
     );
  if bad <> 0 then
    raise exception '% lanes hold a role outside the closed set', bad;
  end if;

  if (select prosrc from pg_proc where oid = 'public.sync_cell_touchpoints(uuid, text[])'::regprocedure)
       ~ 'frontstage_tech' then
    raise exception 'sync_cell_touchpoints still reads a retired touchpoints role';
  end if;
end
$proof$;
