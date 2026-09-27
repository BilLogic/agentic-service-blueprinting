/**
 * The always-loaded tier: what a session is handed before it decides anything.
 *
 * One list, shared by the three checks that hold the router's shape — the char
 * budget (`check-router-budget.mjs`), the negation ratchet
 * (`check-negation-ratchet.mjs`) and the pointer sweep (`check-pointers.mjs`).
 * Two lists would drift the way two vocabularies do: a file added to one and
 * not the others is a file half the guards read. Same reason the `docs` subject
 * of `sweep.mjs` holds the swept set once.
 *
 * ONE MODULE, READ FROM TWO SIDES. The template and every deployment built
 * from it hold this file byte-identical, so everything below is written to be
 * true in whichever repository is running it — and where the two differ, it
 * says which side it means rather than saying "here".
 *
 * WHAT COUNTS AS ALWAYS-LOADED. A file is in this tier when the harness hands
 * it to the session without the session choosing. On both sides that is
 * `AGENTS.md` and nothing else: neither repository tracks a `CLAUDE.md` or a
 * `.claude/` bundle at its root, and no prompt assembler builds one.
 *
 * A plugin manifest is the near miss, and it is OUT on purpose. The template
 * ships one, because the template IS the plugin; a deployment ships none of
 * its own, because it installs the package rather than publishing a plugin.
 * Where a manifest exists it is read by the plugin HOST at install time, to
 * learn the plugin's name, version and where its skills live; nothing puts
 * its bytes in front of a session. What the host does hand a session from it
 * is skill FRONTMATTER, and a skill's frontmatter is loaded because the
 * session invoked that skill — a branch, not a boot. So a manifest is a fact
 * about installation, and the tier is a fact about context, which is why the
 * list below is the same on both sides.
 *
 * WHAT ELSE IS DELIBERATELY OUT, and why each is a Tier-2 read rather than an
 * omission:
 *
 *   - `CONTEXT.md`, `INDEX.md` and `SETUP.md` are named by the router's first
 *     section, which makes them the first three pointers to fire, not part of
 *     the tier. A session that touches no vocabulary and knows where it is
 *     going pays for none of them. They are also large — a glossary alone
 *     runs to several times the router — so counting them would make a
 *     budget on the router meaningless.
 *   - a `README.md`, and any contributor or security policy beside it,
 *     addresses a human arriving at the repository.
 *   - a skill's own `SKILL.md`, and the reference documents it reads, load
 *     when that skill is invoked, which is the whole point of the routing
 *     table.
 *   - a hook — the secret guard is one — runs. It is executed, never read
 *     into context.
 *
 * The tier is a list rather than a walk because membership is a fact about the
 * harness — which file the tool loads unbidden — and no directory encodes it.
 * Adding a file here is a deliberate act that moves three checks at once, in
 * every repository holding this module, which is the intended cost of growing
 * a tier that every session pays for.
 */

/** Repo-relative paths, in load order. */
export const ALWAYS_LOADED = ['AGENTS.md']

/** What the reports say they counted, so a number is never printed bare. */
export const TIER_NOUN = 'always-loaded tier'
