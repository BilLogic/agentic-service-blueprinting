-- An entity has a status, and a lane names its actor.
--
-- Two things the panel editors need that this core never had (#357, split out
-- of #321). Both were built in the instance this template was generalised
-- from, where they earned their shape; this migration brings that shape here
-- so the editors can follow without inventing a second one.
--
-- ── A status ──────────────────────────────────────────────────────────────
--
-- How far along the thing an entity describes is. A current-state blueprint
-- documents what is in use, so the default is `live`; a route being designed
-- is `proposed`, one committed to is `planned`, one that exists and waits is
-- `built`, one being taken away is `deprecated`, and one in trouble is
-- `at_risk`. The vocabulary is ONE domain shared by cells and paths — a
-- second list would drift from the first within a month — and it lives in a
-- column, not in a name prefix a reader has to parse and nothing can query.
--
-- ── A cast, and a lane that picks from it ─────────────────────────────────
--
-- A lane's `name` says what it is called. Which ACTOR does the work — the
-- learner, the tutor, the partner, the service itself — was free text that
-- named the same people four ways and agreed with none of them. So: a cast
-- list, `stakeholders`, and a lane that names its actor by id. A structural
-- lane (the storyboard, the touchpoint rows) names nobody, which is the whole
-- point: a null actor is what tells a reader "this row is scaffolding, not a
-- person".
--
-- The cast is the DEPLOYMENT's, not a service's (ADR 0003). The name is the
-- identity, unique across the whole deployment, and a service "has" an actor
-- exactly when one of its lanes names it. So there is no `service_id` here
-- and never was: the same learner recurs across services by name, not as one
-- row per service. `kind` sorts the cast — recipient | staff | partner |
-- provider | team — and `team` is a kind of its own because a team is a group
-- a lane can be, while `staff` are the people in it who ARE actors too.
--
-- The touchpoint registry is not linked to the cast here. A touchpoint's owner
-- is a join across two catalogs, and this core's touchpoints are still a
-- service's (21000120000000) while the cast is the deployment's; the link
-- waits for the registry to make the same move, so both ends agree.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- A domain, two columns with a default, a table, a nullable column. Every one
-- is additive, so no row is touched and the schema version does not move —
-- this changes what a target CAN hold, not the shape of what the IR authors
-- (the same stance as 21000121000000, 21000123000000, 21000124000000). The
-- proof is an INVARIANT, never a census: the domain exists, both status
-- columns are on it and refuse null, the cast exists and is unique by name,
-- the lane's actor is nullable and points at the cast. Each reads the same on
-- an empty replay as on a live target.

-- @core

-- ---------------------------------------------------------------------------
-- 1. The vocabulary
-- ---------------------------------------------------------------------------

create domain public.entity_status as text
  check (value in ('proposed', 'planned', 'built', 'live', 'at_risk', 'deprecated'));

comment on domain public.entity_status is
  'How far along the thing an entity describes is. One vocabulary shared by '
  'cells and paths — a second list would drift from the first within a month.';

-- ---------------------------------------------------------------------------
-- 2. A cell and a path carry one
-- ---------------------------------------------------------------------------

alter table public.cells
  add column if not exists status public.entity_status not null default 'live';

comment on column public.cells.status is
  'How far along the thing this cell describes is. Defaults to live — a '
  'current-state blueprint documents what is in use.';

alter table public.paths
  add column if not exists status public.entity_status not null default 'live';

comment on column public.paths.status is
  'How far along this route is. Defaults to live. A badge renders from this '
  'row, never from a prefix in the name.';

-- ---------------------------------------------------------------------------
-- 3. The cast
-- ---------------------------------------------------------------------------

create table public.stakeholders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  kind       text not null
               constraint stakeholders_kind_check
               check (kind in ('recipient', 'staff', 'partner', 'provider', 'team')),
  summary    text,
  aliases    text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stakeholders_name_key unique (name)
);

create trigger set_stakeholders_updated_at
  before update on public.stakeholders
  for each row execute function public.set_updated_at();

comment on table public.stakeholders is
  'Deployment-level cast list: one pool of actors a lane picks from, unique by '
  'name across the deployment. A lane references a stakeholder; no service '
  'owns one (ADR 0003).';
comment on column public.stakeholders.name is
  'The identity: unique across the deployment, so the same actor recurs across '
  'services by name rather than as one row per service.';
comment on column public.stakeholders.kind is
  'recipient | staff | partner | provider | team. Who this is to the service. '
  'A team is a group a lane can be; staff are the people in it, and they are '
  'actors too.';
comment on column public.stakeholders.summary is
  'Who this actor IS, for the deployment — not what they do at any one cell.';
comment on column public.stakeholders.aliases is
  'Other spellings this blueprint has used for the same actor, so a match by '
  'name finds them.';

-- ---------------------------------------------------------------------------
-- 4. A lane names its actor
-- ---------------------------------------------------------------------------

alter table public.lanes
  add column if not exists stakeholder_id uuid references public.stakeholders (id);

comment on column public.lanes.stakeholder_id is
  'The actor whose work this lane holds, or null for a structural lane — the '
  'storyboard, the touchpoint rows — that names nobody. An association, not a '
  'parent: the lane is the service''s, the actor is the deployment''s.';

-- @recipe — the cast's RLS and grants, the same shape as every other
-- root-scoped catalog; the lane's actor is one more column the panel writes.
alter table public.stakeholders enable row level security;

create policy stakeholders_select_anon on public.stakeholders
  for select to anon using (true);
create policy stakeholders_select_auth on public.stakeholders
  for select to authenticated using (true);
create policy stakeholders_insert_service_only on public.stakeholders
  for insert to authenticated with check (public.is_service_account());
create policy stakeholders_update_service_only on public.stakeholders
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy stakeholders_delete_service_only on public.stakeholders
  for delete to authenticated using (public.is_service_account());

grant select on public.stakeholders to anon, authenticated;
grant insert, delete on public.stakeholders to authenticated;
grant update (name, kind, summary, aliases) on public.stakeholders to authenticated;
revoke insert, update, delete, truncate on public.stakeholders from anon;
revoke truncate on public.stakeholders from authenticated;

grant update (stakeholder_id) on public.lanes to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  col record;
begin
  if to_regtype('public.entity_status') is null then
    raise exception 'proof: the entity_status domain is missing';
  end if;

  for col in
    select table_name, is_nullable, domain_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name in ('cells', 'paths')
       and column_name = 'status'
  loop
    if col.is_nullable = 'YES' then
      raise exception 'proof: %.status must refuse null — every entity has a status', col.table_name;
    end if;
    if col.domain_name is distinct from 'entity_status' then
      raise exception 'proof: %.status is not on the entity_status domain', col.table_name;
    end if;
  end loop;

  if (select count(*) from information_schema.columns
       where table_schema = 'public'
         and table_name in ('cells', 'paths')
         and column_name = 'status') <> 2 then
    raise exception 'proof: cells.status and paths.status did not both take';
  end if;

  if to_regclass('public.stakeholders') is null then
    raise exception 'proof: the cast is missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.stakeholders'::regclass
                    and conname = 'stakeholders_name_key'
                    and contype = 'u') then
    raise exception 'proof: the cast is not unique by name';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'public'
                and table_name = 'stakeholders'
                and column_name = 'service_id') then
    raise exception 'proof: the cast is the deployment''s — it must not carry a service_id';
  end if;

  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name = 'lanes'
                    and column_name = 'stakeholder_id'
                    and is_nullable = 'YES') then
    raise exception 'proof: lanes.stakeholder_id must exist and be nullable — a structural lane names nobody';
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.lanes'::regclass
                    and contype = 'f'
                    and confrelid = 'public.stakeholders'::regclass) then
    raise exception 'proof: lanes.stakeholder_id does not point at the cast';
  end if;
end
$proof$;
