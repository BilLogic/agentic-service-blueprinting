-- A lane's position is unique within its path, and the check is deferred.

-- ONE PLACE IN THE TREE ALREADY BELIEVED THIS RULE EXISTED, and it was wrong.
--
-- `src/lib/authoringErrors.ts` matched a constraint name to say "Two lanes
-- ended up in the same position." No object has ever carried that name. The
-- thing on those two columns is `lanes_path_row_idx` — a plain, non-unique
-- index created by `20260716200000` as `layers_path_row_idx` and carried
-- through the vocabulary renames — so the branch could not fire, and an author
-- who put two lanes in one slot got no message at all, because nothing refused
-- the write in the first place.
--
-- A matcher on a name nothing carries is dead text, and there are only two
-- honest ways out: delete the entry, or make the rule real. Renaming it onto
-- `lanes_path_row_idx` would be neither — a non-unique index raises nothing,
-- so the entry would still be dead and would now also claim a rule the schema
-- does not have.
--
-- This file is the rule, and it is the last of its kind rather than the first.
-- Five constraints already say "one row per slot in its parent" DEFERRABLE
-- INITIALLY DEFERRED: `path_steps_path_column_unique`, made deferrable by
-- `20260818000000` on the grounds that "the RPCs do the shifting in one
-- transaction, and a deferrable constraint makes that safe rather than lucky";
-- `slides_position_unique`; `cell_touchpoints_cell_position_unique`;
-- `resources_touchpoint_position_unique`; and the `resources_cell_position_unique`
-- exclusion. Lanes were the remaining table with an editor that renumbers and
-- no rule saying what the numbering means.

-- ---------------------------------------------------------------------------
-- DEFERRABLE INITIALLY DEFERRED, BECAUSE EVERY REORDER TRANSIENTLY COLLIDES.
-- ---------------------------------------------------------------------------
--
-- Not belt and braces. An immediate constraint breaks both write paths that
-- move lanes, and both break on ordinary use:
--
--   `reorder_lanes(scenario_id, lane_names[])` is a plpgsql loop issuing one
--   `update … set position = i - 1` per name, all inside the single
--   transaction of the function call. Swap two adjacent lanes and the first
--   statement writes a position the second has not vacated yet. Immediate, it
--   fails there — on the ordinary move a person makes by dragging a lane.
--
--   `add_lane(…, at_position)` opens the slot with one statement, `update
--   public.lanes set position = position + 1 … where position >= target`. A
--   plain UPDATE is checked as each row is written, not at the end, so an
--   n-row shift collides with itself at the first row even though its final
--   state is unique. One statement is not one check.
--
-- Deferral is also what makes the error message worth having: the only way a
-- caller can see this violation is a move that SETTLED on two lanes in one
-- slot, never a move passing through one.
--
-- WHAT IT DOES NOT ASSERT: contiguity. `remove_lane` and `remove_lanes` delete
-- without renumbering, so a path may legally run 0,1,2,4,5. A gap is a display
-- ordering with a hole in it; a duplicate is two lanes claiming one slot.
--
-- ONE COST, NAMED: a deferrable unique index cannot be an `on conflict`
-- arbiter. Nothing infers on (path_id, position), and nothing upserts a lane at
-- all — `supabase/seed.sql` inserts its lanes plainly, and the RPCs that insert
-- lanes (`add_lane`, `create_path`, `create_scenario`, `duplicate_path`,
-- `duplicate_scenario`) carry no `on conflict` either.

-- ---------------------------------------------------------------------------
-- Precondition. The ALTER would fail on its own with a bare unique_violation
-- naming one pair; this says how many, and stops before the DDL. A consumer
-- replaying onto their own data is who this is for.
-- ---------------------------------------------------------------------------
do $precondition$
declare
  dupes int;
  worst text;
begin
  select count(*) into dupes from (
    select path_id, position from public.lanes
    group by path_id, position having count(*) > 1
  ) d;

  if dupes > 0 then
    select string_agg(format('%s@%s×%s', path_id, position, n), ', ')
      into worst
    from (
      select path_id, position, count(*) as n from public.lanes
      group by path_id, position having count(*) > 1
      order by count(*) desc limit 5
    ) d;
    raise exception '% colliding (path_id, position) pairs: %', dupes, worst
      using hint = 'Repair the data first — which lane keeps the slot is an authoring decision, not a schema one.';
  end if;
end
$precondition$;

alter table public.lanes
  drop constraint if exists lanes_path_position_unique;
alter table public.lanes
  add constraint lanes_path_position_unique
    unique (path_id, position) deferrable initially deferred;

comment on constraint lanes_path_position_unique on public.lanes is
  'One lane per slot in a path. Deferred because reorder_lanes renumbers one '
  'statement per lane and add_lane opens a slot with a single self-colliding '
  'UPDATE; both are checked at commit, not mid-flight.';

-- `lanes_path_row_idx` goes: the constraint's own index covers (path_id,
-- position) leading-first, so the old one is a second copy of the same tree for
-- every lane write to maintain — and it is the object whose name was mistaken
-- for a constraint. `lanes_path_id_idx` stays; a leading-column index is a size
-- trade-off that predates this file, not a duplicate of it.
drop index if exists public.lanes_path_row_idx;

-- ---------------------------------------------------------------------------
-- Post-conditions. The shape, then the behaviour — the behaviour proved by
-- performing it on a fixture that is rolled back before this block returns.
-- ---------------------------------------------------------------------------
do $assert$
declare
  con      record;
  cols     text;
  n        int;
  svc      uuid;
  phase    uuid;
  scen     uuid;
  pth      uuid;
  lane_a   uuid;
  lane_b   uuid;
  refused  boolean := false;
  msg      text;
begin
  -- 1. IT EXISTS, AS A UNIQUE CONSTRAINT ON EXACTLY (path_id, position).
  select c.conname, c.contype, c.condeferrable, c.condeferred
    into con
  from pg_constraint c
  join pg_class t     on t.oid = c.conrelid
  join pg_namespace s on s.oid = t.relnamespace
  where s.nspname = 'public' and t.relname = 'lanes'
    and c.conname = 'lanes_path_position_unique';

  if not found then
    raise exception 'lanes_path_position_unique is not on public.lanes';
  end if;
  if con.contype <> 'u' then
    raise exception 'lanes_path_position_unique is contype %, not a unique constraint', con.contype;
  end if;

  -- Column ORDER, not just membership: (position, path_id) would be a
  -- different index and the same constraint, and the wrong one for the
  -- path-scoped reads every board load makes.
  select string_agg(a.attname, ',' order by k.ord) into cols
  from pg_constraint c
  join pg_class t     on t.oid = c.conrelid
  join pg_namespace s on s.oid = t.relnamespace
  cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where s.nspname = 'public' and t.relname = 'lanes'
    and c.conname = 'lanes_path_position_unique';
  if cols is distinct from 'path_id,position' then
    raise exception 'lanes_path_position_unique covers (%), expected (path_id,position)', cols;
  end if;

  -- 2. IT IS DEFERRABLE, AND DEFERRED BY DEFAULT. Deferrable-but-immediate
  -- would pass every shape check above and still fail every drag of a lane,
  -- because nothing in the RPCs issues `set constraints`.
  if not con.condeferrable then
    raise exception 'lanes_path_position_unique is not deferrable: reorder_lanes would fail on its first swap';
  end if;
  if not con.condeferred then
    raise exception 'lanes_path_position_unique is deferrable but not INITIALLY DEFERRED, and no caller defers it';
  end if;

  -- 3. THE DUPLICATE INDEX IS GONE, and exactly one index now covers the pair.
  select count(*) into n
  from pg_index i
  join pg_class t on t.oid = i.indrelid
  join pg_namespace s on s.oid = t.relnamespace
  where s.nspname = 'public' and t.relname = 'lanes'
    and (select string_agg(a.attname, ',' order by k.ord)
         from unnest(i.indkey::int[]) with ordinality as k(attnum, ord)
         join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum)
        = 'path_id,position';
  if n <> 1 then
    raise exception 'expected exactly one index on (path_id, position), found %', n;
  end if;

  -- 4. NO LIVE ROW VIOLATES IT. The ALTER validated the table or it would not
  -- have returned, so this states the fact rather than testing it — and it is
  -- here because a replay onto dirty data is the case where this file must be
  -- read, not trusted.
  select count(*) into n from (
    select path_id, position from public.lanes
    group by path_id, position having count(*) > 1
  ) d;
  if n <> 0 then
    raise exception '% colliding lane positions survived the constraint', n;
  end if;

  -- 5. THE BEHAVIOUR, PERFORMED. Everything below happens on a fixture built
  -- here and rolled back by the sentinel at the end of the block — nothing
  -- touches a real lane, and nothing survives this migration.
  begin
    insert into public.services (name)
      values ('lane-position fixture') returning id into svc;
    insert into public.phases (service_id, name)
      values (svc, 'fixture phase') returning id into phase;
    insert into public.scenarios (phase_id, name)
      values (phase, 'fixture scenario') returning id into scen;
    insert into public.paths (scenario_id, name, kind)
      values (scen, 'fixture path', 'happy') returning id into pth;
    insert into public.lanes (path_id, name, position)
      values (pth, 'A', 0) returning id into lane_a;
    insert into public.lanes (path_id, name, position)
      values (pth, 'B', 1) returning id into lane_b;

    -- 5a. A REORDER THAT COLLIDES MID-FLIGHT SUCCEEDS. This is the exact shape
    -- of `reorder_lanes`: one UPDATE per lane, in the loop's order, inside one
    -- transaction. After the first statement both lanes hold position 0.
    update public.lanes set position = 0 where id = lane_b;

    select count(*) into n from public.lanes
    where path_id = pth and position = 0;
    if n <> 2 then
      raise exception 'the fixture did not collide (% lanes at position 0): the proof below would be vacuous', n;
    end if;

    update public.lanes set position = 1 where id = lane_a;

    -- `set constraints … immediate` runs the deferred check now. Reaching the
    -- next line is the proof: the transient duplicate above was tolerated and
    -- the settled state is accepted.
    set constraints public.lanes_path_position_unique immediate;

    select string_agg(name, '' order by position) into msg
    from public.lanes where path_id = pth;
    if msg <> 'BA' then
      raise exception 'the swap did not settle as B,A but as %', msg;
    end if;

    -- 5b. AND `add_lane`'S SHIFT — one UPDATE moving both rows at once, which
    -- is the shape an immediate constraint refuses row-by-row.
    set constraints public.lanes_path_position_unique deferred;
    update public.lanes set position = position + 1 where path_id = pth;
    set constraints public.lanes_path_position_unique immediate;

    -- 5c. A GENUINE DUPLICATE AT COMMIT STILL FAILS. Same statements, same
    -- deferral — the only difference is that this one does not settle.
    set constraints public.lanes_path_position_unique deferred;
    begin
      update public.lanes set position = 1 where id in (lane_a, lane_b);
      set constraints public.lanes_path_position_unique immediate;
      raise exception 'two lanes committed to the same position: the constraint is not enforcing';
    exception when unique_violation then
      refused := true;
    end;
    if not refused then
      raise exception 'the deferred check accepted two lanes in one slot';
    end if;

    -- Roll the fixture back. Everything since the BEGIN above goes with it;
    -- the DDL is outside this subtransaction and stays.
    raise exception using errcode = 'P0001', message = 'lane-position fixture rollback';
  exception when others then
    get stacked diagnostics msg = message_text;
    if msg <> 'lane-position fixture rollback' then raise; end if;
  end;

  if not refused then
    raise exception 'the duplicate-at-commit case never ran';
  end if;

  if exists (select 1 from public.services where name = 'lane-position fixture') then
    raise exception 'the fixture survived the rollback';
  end if;
end
$assert$;
