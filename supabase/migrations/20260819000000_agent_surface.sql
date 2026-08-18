-- ═══════════════════════════════════════════════════════════════════════════
-- Agent surface: chat persistence + the findings write path for in-app runs.
--
-- 1. agent_sessions / agent_messages — the in-app agent panel's transcript
--    store. Reachable only by the authenticated role; anon deployments never
--    see the agent surface and every persistence call degrades quietly to
--    localStorage. Payload rows are the panel's TranscriptEvent JSON,
--    append-only per (session, seq). seq is bigint because the app writes a
--    per-boot epoch base (Date.now()*1000 + index) so two tabs on one session
--    land in disjoint ranges instead of upserting over each other's rows.
--
-- 2. findings grants — the derived-layer migration revoked authenticated
--    INSERT on findings ("skills write via service key"). The in-app agent's
--    record_finding tool writes through the signed-in session, so the grant
--    comes back here with a permissive insert policy. Authorization is not
--    weakened where the tier recipe is applied: the RESTRICTIVE
--    *_service_only policies from 20260818002000 still AND with these, so a
--    non-service session keeps losing every findings write.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.agent_sessions (
  id uuid primary key,
  title text not null default 'New session',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agent_sessions is
  'One in-app agent conversation (the agent panel''s session list).';

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

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

create policy "authenticated manage agent sessions"
  on public.agent_sessions
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated manage agent messages"
  on public.agent_messages
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Findings: let the in-app agent record and triage through the signed-in
-- session. Dedupe updates touch severity/note/run_id/cell_ids/cell_keys/
-- source, so the status-only column grant from the derived layer widens to
-- the full-row grant; the tier recipe's RESTRICTIVE policies (when applied)
-- still confine every one of these writes to service accounts.
-- ---------------------------------------------------------------------------
grant insert, update on public.findings to authenticated;

drop policy if exists "findings_insert_auth" on public.findings;
create policy "findings_insert_auth" on public.findings
  for insert to authenticated with check (true);
