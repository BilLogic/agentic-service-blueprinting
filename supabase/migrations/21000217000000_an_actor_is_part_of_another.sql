-- `parent_id` says there is a tree. There is not.

-- 21000216000000 gave `stakeholders` a self-reference and held it to exactly
-- one level, then named it `parent_id` — which is the name for the shape, and
-- the shape it names is a tree of any depth. A reader who trusts the name
-- reaches for a recursive CTE, or nests a third level and is refused by a
-- trigger the name gave no warning about.
--
-- Both repositories' prose already had the right word. The column comment
-- says "the actor this one is part of"; the glossary says an actor may be
-- part of another. `part_of_id` names the RELATIONSHIP — membership, which is
-- flat by nature — instead of a graph shape the constraint forbids. It is the
-- same rule the `summary`/`name`/`title` renames settled: the name says the
-- thing.
--
-- Forward-only rather than an amendment to 21000216000000. That migration is
-- released, and a released migration is somebody else's applied history even
-- when it is one version old.
--
-- The dependent names go longhand for the reason the vocabulary migrations
-- documented: a name moved inside dynamic SQL is a name the static readers
-- cannot see, and a retired word nothing can see is a retired word nothing
-- forbids.

alter table public.stakeholders rename column parent_id to part_of_id;

alter table public.stakeholders
  rename constraint stakeholders_parent_not_self to stakeholders_part_of_not_self;

alter index if exists stakeholders_parent_id_fkey rename to stakeholders_part_of_id_fkey;

drop trigger stakeholders_parent_is_flat on public.stakeholders;
drop function public.stakeholders_parent_is_flat();

comment on column public.stakeholders.part_of_id is
  'The actor this one is part of, or null when it is not part of another. '
  'Exactly one level: an actor that is part of something is part of nothing '
  'further. A lane still names the specific actor; this is what lets a reader '
  'roll those up.';

create function public.stakeholders_part_of_is_flat()
returns trigger
language plpgsql
as $$
begin
  if new.part_of_id is not null
     and (select part_of_id from public.stakeholders where id = new.part_of_id)
         is not null then
    raise exception
      'stakeholder % cannot be part of %, which is already part of something else',
      new.name, new.part_of_id
      using errcode = 'check_violation';
  end if;

  if new.part_of_id is not null
     and exists (select 1
                 from public.stakeholders
                 where part_of_id = new.id) then
    raise exception
      'stakeholder % cannot be part of another: other actors are part of it',
      new.name
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.stakeholders_part_of_is_flat() is
  'Holds the cast list to one level of nesting. Both directions, because '
  'either edit breaks it: taking a parent that has one, or taking a parent '
  'while being one.';

create trigger stakeholders_part_of_is_flat
  before insert or update of part_of_id on public.stakeholders
  for each row execute function public.stakeholders_part_of_is_flat();

-- @recipe — UPDATE is granted column by column on this table, and a renamed
-- column keeps the grant under its new name. Naming it again is belt and
-- braces on a host that replayed the grant rather than the rename.

grant update (part_of_id) on public.stakeholders to authenticated;

-- @core

do $flat$
declare
  n integer;
begin
  select count(*) into n
  from public.stakeholders child
  join public.stakeholders parent on parent.id = child.part_of_id
  where parent.part_of_id is not null;

  if n <> 0 then
    raise exception 'the cast list is % rows deeper than one level', n;
  end if;
end
$flat$;
