/**
 * The always-loaded tier: what a session is handed before it decides anything.
 *
 * One list, shared by the three checks that hold the router's shape — the char
 * budget (`check-router-budget.mjs`), the negation ratchet
 * (`check-negation-ratchet.mjs`) and the pointer sweep (`check-pointers.mjs`).
 * Two lists would drift the way two vocabularies do: a file added to one and
 * not the others is a file half the guards read. Same reason `swept-docs.mjs`
 * holds the swept set once.
 *
 * WHAT COUNTS AS ALWAYS-LOADED. A file is in this tier when the harness hands
 * it to the session without the session choosing — here that is `AGENTS.md`
 * and nothing else. There is no `CLAUDE.md` and no `.claude/` bundle in this
 * repository, and no prompt assembler builds one.
 *
 * `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are the
 * near miss, and they are OUT on purpose. They are read by the plugin HOST at
 * install time, to learn the plugin's name, version and where its skills live;
 * nothing puts their bytes in front of a session. What the host does hand a
 * session from them is skill FRONTMATTER, and a skill's frontmatter is loaded
 * because the session invoked that skill — a branch, not a boot. So the
 * manifests are a fact about installation, and the tier is a fact about
 * context.
 *
 * WHAT ELSE IS DELIBERATELY OUT, and why each is a Tier-2 read rather than an
 * omission:
 *
 *   - `CONTEXT.md`, `INDEX.md` and `SETUP.md` are named by § Before the task,
 *     which makes them the first three pointers to fire, not part of the tier.
 *     A session that touches no vocabulary and knows where it is going pays
 *     for none of them. They are also large — `CONTEXT.md` alone is roughly
 *     three times the router, and was eight times it before #137 cut the two
 *     reference maps out — so counting them would make a budget on the router
 *     meaningless.
 *   - `README.md`, `CONTRIBUTING.md` and `SECURITY.md` address a human
 *     arriving at the repository.
 *   - a skill's own `SKILL.md`, and everything under `references/`, loads when
 *     that skill is invoked, which is the whole point of the routing table.
 *   - `hooks/secret_guard.py` runs as a hook. It is executed, never read into
 *     context.
 *
 * The tier is a list rather than a walk because membership is a fact about the
 * harness — which file the tool loads unbidden — and no directory encodes it.
 * Adding a file here is a deliberate act that moves three checks at once, which
 * is the intended cost of growing a tier that every session pays for.
 *
 * Shared shape with the deployment this kit was generalised from
 * (BilLogic/agentic-service-blueprinting#139): same module, same two exports,
 * same reasoning. Only the census of near misses differs, because only this
 * repository ships a plugin manifest.
 */

/** Repo-relative paths, in load order. */
export const ALWAYS_LOADED = ['AGENTS.md']

/** What the reports say they counted, so a number is never printed bare. */
export const TIER_NOUN = 'always-loaded tier'
