-- An actor can be part of another actor.
--
-- The cast list is flat today: eight parties, no relationship between any two
-- of them. A deployment that names its design function on one lane and its
-- design-system function on another cannot ask "what does Design own?" without
-- knowing, outside the database, that the second is inside the first.
--
-- One nullable self-reference fixes that, and it is the whole change. A lane
-- still names ONE actor, the specific one, and the rollup is a join rather
-- than a different way of naming.
--
-- ── Why exactly one level ────────────────────────────────────────────────
--
-- A self-reference with nothing said about depth is an invitation to a cycle,
-- and a cycle turns every rollup into a query that does not finish. Depth is
-- also not free to read: at two levels "what does Design own?" is a recursive
-- CTE, at one it is a single join, and nothing in the model has ever wanted
-- the second.
--
-- So the rule is stated rather than hoped for: a parent has no parent. The
-- trigger enforces it from both directions, because either edit breaks it —
-- pointing at a row that already has a parent, or giving a parent to a row
-- that is already somebody's parent. A `check` cannot see other rows, so it
-- carries only the part that is about this row alone.

alter table public.stakeholders
  add column parent_id uuid references public.stakeholders (id) on delete set null,
  add constraint stakeholders_parent_not_self
    check (parent_id is null or parent_id <> id);

comment on column public.stakeholders.parent_id is
  'The actor this one is part of, or null when it is not part of another. '
  'Exactly one level: a parent has no parent. A lane still names the specific '
  'actor; this is what lets a reader roll those up.';

create function public.stakeholders_parent_is_flat()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null
     and (select parent_id from public.stakeholders where id = new.parent_id)
         is not null then
    raise exception
      'stakeholder % cannot be part of %, which is already part of something else',
      new.name, new.parent_id
      using errcode = 'check_violation';
  end if;

  if new.parent_id is not null
     and exists (select 1
                 from public.stakeholders
                 where parent_id = new.id) then
    raise exception
      'stakeholder % cannot be part of another: other actors are part of it',
      new.name
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.stakeholders_parent_is_flat() is
  'Holds the cast list to one level of nesting. Both directions, because '
  'either edit breaks it: taking a parent that has one, or taking a parent '
  'while being one.';

create trigger stakeholders_parent_is_flat
  before insert or update of parent_id on public.stakeholders
  for each row execute function public.stakeholders_parent_is_flat();

-- @recipe — UPDATE on this table is granted column by column, so a new column
-- is not editable until it is named. Everything above is plain Postgres; this
-- is the one line that is about a role, and roles are Supabase's half.

grant update (parent_id) on public.stakeholders to authenticated;

-- @core

do $flat$
declare
  n integer;
begin
  -- An invariant, not a census: whatever rows exist, none of them is two
  -- levels deep. Vacuously true on an empty database, and exactly as strong
  -- on a seeded one.
  select count(*) into n
  from public.stakeholders child
  join public.stakeholders parent on parent.id = child.parent_id
  where parent.parent_id is not null;

  if n <> 0 then
    raise exception 'the cast list is % rows deeper than one level', n;
  end if;
end
$flat$;
