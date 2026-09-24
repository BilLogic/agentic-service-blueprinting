# Which agent surfaces work today

Research for the question "Which agent surfaces work today" (part of the
marketing-site map). Checked 2026-09-24 against template `origin/main`
(`4ee59de3`, v1.44.29) and the deployment repo `BilLogic/plus-uno-blueprint`
at `origin/main`, plus the live site https://uno-blueprint.netlify.app viewed
signed-out.

**LIVE** means built and wired, in the template or the deployment.
**POSSIBLE** means reachable through the adapter contract or the read
contract, but nobody has shipped it. **NOT BUILT** means neither of those.

## Verdicts

| Surface | Template | Uno Blueprint deployment |
| --- | --- | --- |
| 1. In-app chat agent | LIVE | LIVE, sign-in only |
| 2. Claude Code via the `sb` plugin | LIVE | LIVE (the repo's own agent workflow) |
| 3. Slack bot | NOT BUILT (the docs describe it as a shape) | LIVE (uno-bot, in a separate repo) |
| 4. MCP sources for `sb:map` | the runtime's MCP; Figma/FigJam named, others not | n/a |
| 5. RAG / vector retrieval | POSSIBLE (the tool ships off; no schema ships) | LIVE (pgvector + gemini-embedding-001) |
| 6. Cursor / Codex / other agents | POSSIBLE (they read AGENTS.md as a router) | POSSIBLE (they can query the published anon REST API) |
| 6. ChatGPT / Gemini / Perplexity as products | NOT BUILT | NOT BUILT |

## 1. In-app chat agent: LIVE, behind sign-in

- The keys belong to the user and live in their browser. `src/lib/agent/settings.ts:5`
  says "BYO-key agent settings. Keys live in localStorage and nowhere else".
  There are three providers: `src/lib/agent/providers/{anthropic,openai,google}.ts`.
- The agent needs a signed-in session on a configured deployment:
  `src/contexts/SupabaseProvider.tsx:320-321` sets
  `canAgent: isSampleTrial || (configured && (session !== null || isDevAuthoring))`.
  Account tier controls writing (`canAgentWrite: canWrite && !isSampleTrial`),
  not asking. On a deployment with no database, the agent runs as a sample trial.
- The deployment configures it: `deployment/deployment.ts:92-141` adds
  reference docs and search.
- On the live site, signed-out visitors see the board and an "Agent settings"
  button. Clicking it opens a sign-in popover whose text reads "Signing in
  unlocks editing and the agent on this device." **A visitor cannot try the
  agent.** The site should not suggest that visitors can chat with the live
  Uno board.

## 2. Claude Code via the `sb` plugin: LIVE

- `.claude-plugin/plugin.json` and `marketplace.json` declare the plugin
  (v1.44.29, 4 skills). `hooks/hooks.json` wires three hooks:
  SessionStart status, IR validation after edits, and a secret guard
  before writes.
- The install path is in `AGENTS.md:3-5`
  (`claude plugin marketplace add` → `claude plugin install sb@sb-marketplace`).
- To reach a deployed blueprint, it writes through the Supabase CLI or the
  Supabase MCP (`references/adapter-contract.md:14`, `:190-205`). It never
  hardcodes a server name and enumerates the connected servers at runtime.
  The user must authorise the Supabase MCP or CLI for their own project.

## 3. Slack bot: NOT in the template, LIVE in the deployment

- **Template:** `docs/guide/02-using-it-in-practice.md:45-49` says:
  "**nothing here is a Slack bot**". The row describes a shape that a
  deployment can build with the anon key alone. What the template does ship
  is the read-consumer rules in `references/adapter-contract.md:209-230`.
  - Watch the copy: `README.md:62-64` and the four-ways-in figure
    present "The Slack bot on top" as one of four ways in, without that
    caveat. The site must not copy it as a template feature.
- **Deployment:** uno-bot ("le goat") is a Cloudflare Worker in the
  PLUS-UNO kit repo (`PLUS-UNO/plus-vibe-coding-starting-kit/agents/uno-bot`,
  named in `scripts/check-bot-contract-probe.mjs:195`). Sources:
  `docs/connectors/plus-uno.md:8-12`, `deployment/lib/blueprintContract.ts:1-10`.
- **Verified running:** `https://uno-bot.plus-uno.workers.dev/health/blueprint`
  returned `"ok":true`, build `r403-a1db507`, and every probe was true
  (search_blueprint RPC; cells, dependencies, findings, slices and
  touchpoints tables). The `bot-contract-probe` workflow passed on its daily
  schedule on 2026-09-22, 09-23 and 09-24.
- The deployment calls it "an instance integration, not harness"
  (`docs/connectors/plus-uno.md:14-15`). The bot is PLUS's own and is not
  part of the open-source template.

## 4. MCP connections `sb:map` uses to read sources

- **These are the runtime's MCP servers, not the skill's.** The plugin
  ships no `.mcp.json`. The skill uses whatever servers the host agent
  already has connected, so the user connects and authorises each one in
  their own client.
- Only **Figma / FigJam** is named as a source:
  `skills/map/references/ingest-playbook.md:40` ("Via MCP when connected",
  fetched per frame) and `translate-playbook.md:11`. Without MCP, the skill
  falls back to exporting the board to CSV or text. Miro works through CSV
  only.
- **Notion, Linear and GitHub are not named as MCP sources anywhere in the
  skills.** Notion shows up only as a lane-vocabulary mapping
  (`references/lane-vocabulary.md:95`) and as a hypothetical backend in
  the adapter contract (`references/adapter-contract.md:286`). The skill
  also reads local md/docx/pdf/xlsx files
  (`ingest-playbook.md` §2). Any MCP connection the agent has *could* supply a
  document, but the site must not claim a Notion, Linear or GitHub integration.
- **Supabase MCP** is the only MCP the skills address directly, and only
  as a write target.
- Authorisation: the user must authorise each MCP server (Figma, Supabase)
  in their own client. For Supabase, the service-role key must never be
  written to disk (`references/adapter-contract.md` §Secrets;
  `hooks/secret_guard.py`).

## 5. RAG / vector retrieval

- **Template: POSSIBLE, and off by default.** `CHANGELOG.md:4237-4242`
  (v1.40.0) says `search_blueprint` "needs a database function this
  template's schema does not ship, so it is OFF by default";
  `src/lib/agent/searchPlan.ts:88` returns `offered: false` unless search
  is enabled. When a deployment enables it, the user's own key embeds the
  question in the browser. A server-held credential embeds the cells.
- **Uno Blueprint: LIVE.** The deployment enables search in
  `deployment/deployment.ts:138-140`, with
  `indexes: [{ provider: 'google', model: 'gemini-embedding-001', dimensions: 768 }]`.
  - Schema: `supabase/migrations/20260809000000_semantic_search_vendored.sql:28`
    (`create extension if not exists vector`) and the 768-dim embedding
    column, which later migrations moved to gemini-embedding-001
    (`20260912000000_the_blueprint_index_speaks_gemini_embedding_001.sql`).
  - `public.search_blueprint()` fuses vector, prose and structural-name
    matches by reciprocal rank and returns `matched_by` and `total_matched`
    (`docs/engineering/access-and-security.md` §semantic_search schema).
  - A nightly embed backfill runs at 07:00 UTC in the uno-bot repo, and
    `index_health()` watches it. The bot and the in-app agent share the
    index.
  - Only users on a **Google key** get meaning search in the in-app agent.
    OpenAI-key users are not offered the tool at all, since the second
    index is empty. Anthropic has no embedding model.

## 6. Other agents (Cursor, Codex, ChatGPT, Gemini, Perplexity)

- **Cursor / Codex / any agent that reads AGENTS.md: POSSIBLE.**
  `AGENTS.md:4-7` says that any other agent "reads this file as the
  router: the skills are plain markdown and work anywhere". The secret
  guard hook only runs in Claude Code, so other runtimes enforce it by
  hand (`AGENTS.md` rules). Nothing tests these runtimes: there is no
  Cursor rules file, Codex config or eval.
- **External read-only agents: POSSIBLE.** Anything holding the anon key
  can query the published REST API and the `search_blueprint` RPC. The recipes are in
  `plus-uno-blueprint:docs/agents/blueprint-direct-access.md`. uno-bot is
  the one consumer that actually does this.
- **ChatGPT / Gemini / Perplexity as products (custom GPT, Gem, connector):
  NOT BUILT.** Neither repo has anything for them. Gemini and OpenAI appear
  only as **model providers** inside the in-app agent (BYO key). The site
  can say "bring an Anthropic, OpenAI or Google key". It must not say
  "works in ChatGPT, Gemini or Perplexity".

## Uncertain

- I read uno-bot's source only through the contract and its health probe,
  and I did not open the bot's repo. I also did not verify that it answers
  in Slack itself. The health endpoint shows only that its database reads
  work.
- I did not test the in-app agent end to end on the live site, because I
  did not sign in.
- I did not query `index_health()` directly, so the index's freshness is
  unverified. The daily probe passing suggests it is healthy.
- MCP access through Notion, Linear or GitHub works only in the sense that
  "any connected MCP returns text the skill can read". Nothing in the skills
  exercises them.
