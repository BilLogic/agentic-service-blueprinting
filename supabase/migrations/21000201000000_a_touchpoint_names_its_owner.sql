-- A touchpoint names its owner.
--
-- `21000131000000` wrote the promissory note in its own header: "A touchpoint
-- will carry a `stakeholder_id` — its owner. With the tools per service and the
-- actors the deployment's, a shared tool's owner would have to be one service's
-- actor, and there is no answer to which. The link waits for both ends to be
-- the deployment's, and after this file they are." Both ends are. This is the
-- link.
--
-- ── Why the wait was the whole argument ────────────────────────────────────
--
-- `stakeholders` was born deployment-level in `21000125000000`; `touchpoints`
-- became deployment-level in `21000131000000`. Until that second move the
-- column was not merely premature, it was unanswerable: a registry row scoped
-- to one service, pointing at a cast shared by all of them, forces the question
-- "whose actor owns the shared tool?" onto a schema that has no way to hold two
-- answers. With both pools now keyed on name across the whole deployment the
-- question dissolves — one Zoom, one owner, named once.
--
-- ── An association, not a parent ───────────────────────────────────────────
--
-- The same relationship `21000125000000` gave a lane, and it carries the same
-- shape for the same reason. A touchpoint is not a child of its owner: it
-- exists whether or not anybody has said who runs it, it is minted by
-- `sync_cell_touchpoints` from a cell's text with no owner at all, and taking
-- an actor out of the cast should not take the tool off the board with it. So
-- the column is NULLABLE — "nobody has said yet" is the ordinary state, not a
-- gap — and there is no cascade.
--
-- ── The deviation from the deployment, stated rather than smuggled ─────────
--
-- The deployment this template generalises writes `stakeholder_id uuid
-- references public.stakeholders (id)` with no delete action, which is NO
-- ACTION: deleting an actor who owns a touchpoint is REFUSED. This file writes
-- `on delete set null` instead, matching `lanes.stakeholder_id` in
-- `21000125000000` and the sentence that migration already committed the
-- template to — "an actor taken out of the cast un-names its lanes rather than
-- pinning itself."
--
-- Mirroring the deployment here would make the template incoherent with itself:
-- removing an actor would silently un-name their lanes and simultaneously be
-- refused by their touchpoints, so the cast would hold two contradictory
-- opinions about what deleting an actor means. One rule for the cast, applied
-- to both things that reference it, is the position; the deployment is the
-- looser of the two and can tighten to it. This is the one place this file
-- deliberately does not copy the deployment, and it is written down here so a
-- reader meets the choice rather than the difference.
--
-- ── What does NOT move ─────────────────────────────────────────────────────
--
-- The schema version stays where `21000122000000` left it — the same stance
-- `21000123000000`, `21000124000000`, `21000130000000` and `21000131000000`
-- took. An IR describes one service and authors a touchpoint's name, kind,
-- summary and home; who OWNS the tool has never been one of its fields, and
-- `registryTouchpoint` in `references/ir-schema.json` is unchanged, so nothing
-- authored moves and no file needs carrying forward.
--
-- The seed generators are unaffected for the same reason: both write
-- `insert into public.touchpoints (id, name, kind, summary, url, origin)`, and
-- a new nullable column with no default changes nothing about a column list
-- that does not name it.
--
-- ── The index ──────────────────────────────────────────────────────────────
--
-- `21000125000000` put one on `lanes.stakeholder_id` with the reason that
-- "every other foreign key in the series has its index", and the same two
-- readers exist here: the delete path walks touchpoints by actor to find what
-- an outgoing actor un-names, and the owner picker walks them the same way.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- Additive: one nullable column, one index, one grant. Every statement is
-- `if not exists` or dropped-first, so a re-run and an empty replay both no-op.
-- `public.stakeholders` is created by `21000125000000`, seven files upstream in
-- this same series, so unlike the deployment's version this reference needs no
-- `to_regclass` guard — the target is always there by the time this runs.
--
-- The proof is an INVARIANT, never a census: the column exists and is nullable,
-- it points at the cast, and its delete action is SET NULL. All three read the
-- same on an empty replay as on a populated target, which is the point.

-- ── 1. The column ──────────────────────────────────────────────────────────

alter table public.touchpoints
  add column if not exists stakeholder_id uuid
    references public.stakeholders (id) on delete set null;

comment on column public.touchpoints.stakeholder_id is
  'The actor who owns this touchpoint — who runs the app, publishes the '
  'document, staffs the channel — or null when nobody has said yet, which is '
  'the ordinary state for a row the sync minted from a cell''s text. An '
  'association, not a parent: both the tool and the actor are the '
  'deployment''s (ADR 0003), and an actor taken out of the cast un-names its '
  'touchpoints rather than pinning itself, exactly as it un-names its lanes.';

-- ── 2. Its index ───────────────────────────────────────────────────────────

create index if not exists touchpoints_stakeholder_id_idx
  on public.touchpoints (stakeholder_id);

-- @recipe — the owner is one more column the registry panel writes, and
-- `authenticated` is the caller class that writes it. The table's other
-- column grants were written in `21000120000000`; this extends that surface
-- by one column and changes nothing else about the posture.
grant update (stakeholder_id) on public.touchpoints to authenticated;
-- @core

-- ── 3. Prove it ────────────────────────────────────────────────────────────
--
-- Invariants, not a census. An empty replay satisfies all three, and a
-- populated target is the case they exist to check.

do $proof$
declare
  v_delete_action "char";
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public'
                    and table_name = 'touchpoints'
                    and column_name = 'stakeholder_id'
                    and is_nullable = 'YES') then
    raise exception
      'proof: touchpoints.stakeholder_id must exist and be nullable — a touchpoint nobody has claimed names nobody';
  end if;

  select confdeltype into v_delete_action
    from pg_constraint
   where conrelid = 'public.touchpoints'::regclass
     and contype = 'f'
     and confrelid = 'public.stakeholders'::regclass;

  if v_delete_action is null then
    raise exception 'proof: touchpoints.stakeholder_id does not point at the cast';
  end if;

  -- 'n' is SET NULL. The deviation argued in the header is only real if it is
  -- the shape the database actually holds, so it is asserted rather than
  -- described.
  if v_delete_action <> 'n' then
    raise exception
      'proof: touchpoints.stakeholder_id deletes as %, not SET NULL — an actor leaving the cast must un-name its touchpoints, not be refused', v_delete_action;
  end if;
end
$proof$;
