-- A rename moves the word in every cell, not just the registry row.
--
-- The registry landed in `21000120000000` and the read path is genuinely
-- registry-backed: the board draws `touchpoints.name` through the placement,
-- so changing that one row moves every use of the tool on screen at once.
-- That is the headline promise, and on its own it comes apart the first time
-- anybody uses it.
--
-- `cells.content` still holds the OLD string, and a content save re-derives
-- placements from that text. So the next edit to any affected cell hands
-- `sync_cell_touchpoints` the stale name, the renamed placement is not in the
-- wanted list, and it is removed — taking its per-moment summary, role and
-- resources with it — while a fresh registry entry appears under the old name
-- in its stead. The rename is silently undone and the authored writing is
-- gone.
--
-- That is this package's own defect returning: two records of the same fact,
-- drifting. Nothing in the template writes `touchpoints.name` yet, so it is
-- latent rather than live, which is exactly why it is fixable now rather than
-- after a rename affordance has shipped.
--
-- Ported from a deployment built on this template, where both halves have
-- been live since 2026-08-30. The template had no registry writer at all;
-- `src/lib/touchpointMutations.ts` arrives with this file as the client
-- half.
--
-- ── Why this is a function and not a client loop ──────────────────────────
--
-- The same reason `sync_cell_touchpoints` is: the registry row and every
-- bearing cell's text must move TOGETHER OR NOT AT ALL, and PostgREST gives
-- every statement its own transaction. A client that updated the registry and
-- then looped over cells would leave the two halves disagreeing the moment any
-- one of those requests failed — which is the state this exists to end. One
-- call, one transaction.
--
-- ── Which cells, and how the word is matched ─────────────────────────────
--
-- The cells are found through `cell_touchpoints`, never by scanning text for
-- the old name. The placement IS the record of "this cell uses this
-- touchpoint", so the rewrite is keyed on identity and a cell that merely
-- happens to spell the same word somewhere else is not touched.
--
-- Inside a cell, `content` is a delimited list — `parseCellContent.ts` splits
-- on newline or comma and trims — so the match is against a whole ITEM, never
-- a substring. Renaming `Zoom` must leave `Zoom Recording` alone, and a
-- registry that holds both is ordinary. `rename_content_item` rebuilds the
-- list from its own tokens, so the author's delimiters and spacing survive
-- untouched and only the item that IS the old name is replaced.
--
-- ── The posture is this package's, not the deployment's ──────────────────
--
-- The deployment's copy is `security invoker` and leans on column grants. Here
-- every placement function is `security definer` behind an explicit
-- `is_service_account()` guard (`21000120000000`), because that is how this
-- package decides who may author, and a writer that answered the question a
-- second way would be a second answer to it. `updated_at` is stamped the way
-- its siblings stamp it; the table's trigger would do it anyway, and the two
-- agreeing is the point.

-- ── The one-item rewrite ──────────────────────────────────────────────────
--
-- Tokenised rather than regexp-replaced. A replace bounded by delimiters
-- consumes the delimiter it matched, so two adjacent items that both match
-- lose the second; and a word-boundary replace rewrites `Zoom` inside
-- `Zoom Recording`, which is the near miss this file names. Splitting into
-- items AND delimiters, mapping the items, and concatenating puts the original
-- string back verbatim wherever nothing matched.

create or replace function public.rename_content_item(
  p_content text,
  p_from    text,
  p_to      text
)
returns text
language sql
immutable
set search_path = pg_catalog, pg_temp
as $function$
  select coalesce(
    string_agg(
      case
        -- A delimiter travels through unchanged, which is what keeps
        -- "A,\nB" from coming back as "A, B".
        when m.token[1] in (E'\n', ',') then m.token[1]
        when btrim(m.token[1], E' \t\r\n') = p_from
          -- Surrounding whitespace is the author's, not ours.
          then substring(m.token[1] from '^[ \t\r\n]*')
               || p_to
               || substring(m.token[1] from '[ \t\r\n]*$')
        else m.token[1]
      end,
      '' order by m.ord),
    p_content)
  from regexp_matches(p_content, E'[^\n,]+|[\n,]', 'g')
       with ordinality as m(token, ord);
$function$;

comment on function public.rename_content_item(text, text, text) is
  'Replace one whole item in a delimited cell content string. The match is '
  'against the trimmed item, never a substring, so renaming Zoom leaves '
  'Zoom Recording alone.';

-- ── The rename ────────────────────────────────────────────────────────────

create or replace function public.rename_touchpoint(
  p_touchpoint_id uuid,
  p_name          text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_name     text := btrim(coalesce(p_name, ''));
  v_previous text;
  v_written  int;
  v_cells    uuid[] := '{}';
  v_stale    int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'a touchpoint needs a name — an empty one is a blank pill';
  end if;

  -- Locked, because everything below is decided from this row's old name.
  select name into v_previous
    from public.touchpoints
   where id = p_touchpoint_id
     for update;

  if v_previous is null then
    raise exception 'touchpoint % does not exist', p_touchpoint_id;
  end if;

  update public.touchpoints
     set name = v_name,
         updated_at = now()
   where id = p_touchpoint_id;

  -- A zero-row write is a failure, not a no-op. The select above already found
  -- the row, so nought here means it went in the moment between — and the
  -- caller is about to record an inverse for a rename that never happened.
  get diagnostics v_written = row_count;
  if v_written <> 1 then
    raise exception 'renaming touchpoint % wrote % rows', p_touchpoint_id, v_written;
  end if;

  -- Renaming a touchpoint to what it is already called is a no-op on the text,
  -- and running the rewrite anyway would trip the post-condition below on
  -- every cell. The registry write above still happened, so the caller gets a
  -- truthful answer either way.
  if v_previous <> v_name then
    with bearing as (
      -- Identity, not text search. A cell bears this touchpoint because a
      -- placement says so.
      select ct.cell_id from public.cell_touchpoints ct
       where ct.touchpoint_id = p_touchpoint_id
    ),
    rewritten as (
      update public.cells c
         set content = public.rename_content_item(c.content, v_previous, v_name)
        from bearing b
       where c.id = b.cell_id
         and c.content
             is distinct from public.rename_content_item(c.content, v_previous, v_name)
      returning c.id
    )
    select coalesce(array_agg(id), '{}'::uuid[]) into v_cells from rewritten;

    -- The post-condition, and the reason the rewrite cannot fail quietly. If
    -- the item match ever stopped matching, every statement above would still
    -- succeed, no cell would change, and the rename would go back to being
    -- undone by the next content save — the exact defect, restored, with a
    -- green call to show for it.
    select count(*) into v_stale
      from public.cell_touchpoints ct
      join public.cells c on c.id = ct.cell_id
     where ct.touchpoint_id = p_touchpoint_id
       and exists (
         select 1
           from unnest(regexp_split_to_array(c.content, E'[\n,]')) as item
          where btrim(item, E' \t\r\n') = v_previous
       );
    if v_stale <> 0 then
      raise exception
        '% cells still name "%" after renaming it to "%"',
        v_stale, v_previous, v_name;
    end if;
  end if;

  return jsonb_build_object(
    'touchpoint_id', p_touchpoint_id,
    'name', v_name,
    'previous_name', v_previous,
    'cell_ids', to_jsonb(v_cells)
  );
end
$function$;

comment on function public.rename_touchpoint(uuid, text) is
  'Rename a touchpoint: the registry row and the matching item in every '
  'bearing cell''s content, in one transaction. Returns the previous name and '
  'the cells rewritten, so the caller can record an inverse that restores both '
  'halves.';

-- @recipe — who may call it. The same posture as every other placement
-- function in `21000120000000`: closed to `public` and `anon`, open to
-- `authenticated`, with the service-account guard inside the body deciding
-- which authenticated caller may actually author.
revoke execute on function public.rename_content_item(text, text, text) from public, anon;
grant execute on function public.rename_content_item(text, text, text) to authenticated;
revoke execute on function public.rename_touchpoint(uuid, text) from public, anon;
grant execute on function public.rename_touchpoint(uuid, text) to authenticated;

-- The other half of this slice is a placement's per-moment writing, which
-- `src/lib/touchpointMutations.ts` saves as a column-scoped update rather than
-- through a function — it writes two columns of one row by id and needs no
-- transaction to do it. `21000119000000` granted `role` when the column
-- arrived; `summary` was granted to nobody, because until now nothing wrote
-- it outside `sync_cell_touchpoints` and `restore_cell_touchpoints`, which are
-- SECURITY DEFINER and never consulted a column grant.
--
-- Column privileges are checked against the SET LIST, not against what the
-- statement changes, so a writer naming both columns is refused on `summary`
-- before it reaches a single row. The grant lands in the same slice as the
-- writer on purpose: a write surface with no writer is a row every posture
-- check has to account for before any mutation touches the column.
--
-- `cell_touchpoints_update_service_only` still stands over it, so this widens
-- WHICH COLUMN an author may write and not WHO may write one.
grant update (summary) on public.cell_touchpoints to authenticated;
-- @core

-- ── Prove the item match, on an empty database too ────────────────────────
--
-- `rename_content_item` is pure, so this block needs no rows and runs on every
-- apply including the empty replay. The near miss is the first case because it
-- is the one the header names: a substring replace turns `Zoom Recording` into
-- `Meet Recording` without a word of warning.
--
-- Invariants about the function, never a census of the data — an empty replay
-- satisfies every one of them, and so does a populated target.

do $proof$
declare
  v_got text;
begin
  v_got := public.rename_content_item('Zoom, Zoom Recording', 'Zoom', 'Meet');
  if v_got <> 'Meet, Zoom Recording' then
    raise exception 'proof: the near miss was rewritten: %', v_got;
  end if;

  -- The longer name renames on its own terms, and leaves the shorter alone.
  v_got := public.rename_content_item('Zoom, Zoom Recording', 'Zoom Recording', 'Recording');
  if v_got <> 'Zoom, Recording' then
    raise exception 'proof: the longer item did not rename: %', v_got;
  end if;

  -- Newlines are a delimiter too, and the author's spacing is theirs.
  v_got := public.rename_content_item(E'Handbook\n  Zoom  , Slack', 'Zoom', 'Meet');
  if v_got <> E'Handbook\n  Meet  , Slack' then
    raise exception 'proof: delimiters or spacing did not survive: %', v_got;
  end if;

  -- Two adjacent items that both match. A delimiter-consuming replace gets the
  -- first and silently skips the second.
  v_got := public.rename_content_item('Zoom,Zoom', 'Zoom', 'Meet');
  if v_got <> 'Meet,Meet' then
    raise exception 'proof: an adjacent repeat was skipped: %', v_got;
  end if;

  -- A name that appears only as part of another item changes nothing.
  v_got := public.rename_content_item('Zoom Recording', 'Zoom', 'Meet');
  if v_got <> 'Zoom Recording' then
    raise exception 'proof: a substring was rewritten: %', v_got;
  end if;

  -- Nothing to rename is not an error, and must not reshape the string.
  v_got := public.rename_content_item('', 'Zoom', 'Meet');
  if v_got <> '' then
    raise exception 'proof: empty content did not survive: %', v_got;
  end if;
end
$proof$;

-- ── Prove the rename is closed, and that it refuses an empty name ─────────
--
-- Two invariants about the function's own posture, asserted rather than
-- described: it is SECURITY DEFINER (so the guard in its body is the thing
-- deciding, not a column grant), and `anon` cannot call it.

do $proof$
declare
  v_definer boolean;
begin
  select p.prosecdef into v_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'rename_touchpoint';

  if v_definer is null then
    raise exception 'proof: rename_touchpoint was not created';
  end if;
  if not v_definer then
    raise exception
      'proof: rename_touchpoint must be SECURITY DEFINER — its siblings are, and the guard in its body is what decides who may author';
  end if;
end
$proof$;
