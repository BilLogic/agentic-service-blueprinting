-- ═══════════════════════════════════════════════════════════════════════════
-- Agent surface: chat persistence + the findings write path for in-app runs.
--
-- 1. agent_sessions / agent_messages — the in-app agent panel's transcript
--    store, PER USER: every session row carries created_by (defaulted to
--    auth.uid() so the app never sets it) and the policies scope both tables
--    to the owning user. Reachable only by the authenticated role; anon
--    deployments never see the agent surface and every persistence call
--    degrades quietly to localStorage. Payload rows are the panel's
--    TranscriptEvent JSON, append-only per (session, seq). seq is bigint
--    because the app writes a per-boot epoch base (Date.now()*1000 + index)
--    so two tabs on one session land in disjoint ranges instead of upserting
--    over each other's rows.
--
-- 2. findings grants — the derived-layer migration revoked authenticated
--    INSERT on findings ("skills write via service key"). The in-app agent's
--    record_finding tool writes through the signed-in session, so the grant
--    comes back here in the same hardened form as the authoring foundation:
--    insert-as-open only, update narrowed to the columns record-finding
--    actually touches. The tier recipe's RESTRICTIVE *_service_only policies
--    from 20260818002000 still AND with these where applied.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.agent_sessions (
  id uuid primary key,
  title text not null default 'New session',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agent_sessions is
  'One in-app agent conversation (the agent panel''s session list). Owned by created_by; RLS keeps transcripts per-user.';

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions (id) on delete cascade,
  seq bigint not null,
  kind text not null check (kind in ('user', 'assistant', 'tool', 'status')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

comment on table public.agent_messages is
  'Transcript events of an agent session, ordered by seq. Payload mirrors the app''s TranscriptEvent.';

create index agent_messages_session_idx
  on public.agent_messages (session_id, seq);

-- @recipe — the caller stamp, RLS, the owner-scoped policies, and the
-- findings grants: every one of them names a Supabase primitive.
alter table public.agent_sessions
  alter column created_by set default auth.uid();

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

-- Transcripts are private to their author. The app never writes created_by —
-- the column default stamps the caller, which is exactly what the WITH CHECK
-- requires, so inserts pass and every read/update/delete is filtered to the
-- caller's own rows.
create policy "agent sessions are owner-scoped"
  on public.agent_sessions
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "agent messages are owner-scoped"
  on public.agent_messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.agent_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agent_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Findings: let the in-app agent record and triage through the signed-in
-- session, restoring the foundation migration's hardened form
-- (20260818000000) rather than a blanket grant:
--
--   * A finding may only be INSERTED as open — the dedupe rule is "dismissed
--     stays dismissed", so an insert that could set status directly would let
--     one forged pre-dismissed row permanently suppress a real finding from
--     every future audit run. record_finding inserts without status and takes
--     the column default ('open').
--   * The UPDATE grant is column-narrowed to what record-finding's
--     update-in-place and human triage actually write. Delete stays revoked
--     everywhere; findings_open_fingerprint_idx remains the dedupe backstop.
--
-- The tier recipe's RESTRICTIVE policies (when applied) still confine every
-- one of these writes to service accounts.
-- ---------------------------------------------------------------------------
grant insert on public.findings to authenticated;
revoke update on public.findings from authenticated;
grant update (status, note, severity, run_id, cell_ids, cell_keys, source)
  on public.findings to authenticated;

drop policy if exists "findings_insert_auth" on public.findings;
create policy "findings_insert_auth" on public.findings
  for insert to authenticated with check (status = 'open');
