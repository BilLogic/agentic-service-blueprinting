/**
 * This repository's own numbers and paths, read by the meta-checks.
 *
 * The router, glossary, sweep and docs-index scripts are one mechanism in
 * every repository that carries them — this template and each deployment of
 * it — but each repository has its own router, its own docs tree and its own
 * routing. Those values live here and nowhere else, so the scripts that read
 * them can be the same file everywhere. It is the seam the app draws with
 * `DeploymentConfig`: the mechanism is shared, the values are the
 * installation's.
 *
 * NEVER SHARED. Every repository writes its own copy of this file, and no
 * sync, import or merge carries it across. A value copied from another
 * repository describes that repository's files: a budget set against a
 * different router passes while measuring nothing.
 *
 * Every field is required. `DeploymentConfig` is a sparse overlay on the
 * template's defaults; this file has no defaults to fall back to, because a
 * check with no number of its own has nothing to hold the repository to.
 */

/** The generated interface-to-schema map. Named once, read twice below. */
const INTERFACE_MAP = 'references/interface-schema-map.md'

export const repoConfig = {
  router: {
    /**
     * The always-loaded tier's ceiling, in characters (`check-router-budget.mjs`).
     * Set against this router, whose skill routing table carries four rows.
     * Lower it whenever the tier lands well under.
     */
    budget: 4600,
    /** How far under `budget` the tier may sit before the budget is stale. */
    slack: 920,
    /**
     * The prohibition-token baseline across the tier (`check-negation-ratchet.mjs`):
     * the files it was measured over, and the count it scored.
     */
    prohibitions: { files: 1, tokens: 1 },
  },

  /**
   * Folders whose markdown every prose sweep reads, beside the root docs
   * (`swept-docs.mjs`). A folder this repository does not have sweeps as
   * empty, so a misspelt name here sweeps nothing: check it against the tree.
   */
  sweptDirs: ['docs', 'references', 'skills', 'agents'],

  /**
   * Where a glossary row that names a column belongs instead
   * (`check-glossary-only.mjs`), and a routing target below.
   */
  interfaceMap: INTERFACE_MAP,

  /** The authored half of the generated `INDEX.md` (`generate-docs-index.mjs`). */
  docsIndex: {
    /**
     * A row per task someone arrives holding, phrased the way they would ask
     * it. Targets are repo-relative paths, and include the plugin contract's
     * own folders — an agent's task is far more often "which rule applies"
     * than "which document".
     */
    routing: [
      ['What is this, and why would I want it?', 'README.md'],
      ['What does this word mean — lane, path, slice, dependency, finding?', 'CONTEXT.md'],
      ['What does this panel label actually name in the schema?', INTERFACE_MAP],
      ['Get it running on my machine', 'SETUP.md'],
      ['I am an agent — which skill do I follow?', 'AGENTS.md'],
      ['Read the whole thing start to finish', 'docs/guide/'],
      ['What exactly am I looking at in a blueprint?', 'docs/guide/01-the-blueprint-model.md'],
      ['What do I actually do with a blueprint?', 'docs/guide/02-using-it-in-practice.md'],
      ['How does the plugin machinery work, and what lands on my disk?', 'docs/guide/03-the-plugin.md'],
      ['Who may do what once it is deployed?', 'docs/guide/04-operations.md'],
      ['The tables, columns, enums and import order', 'references/data-model.md'],
      ['What a blueprint file has to contain', 'references/ir-schema.json'],
      ['What a backend has to satisfy to serve this app', 'references/adapter-contract.md'],
      ['Which tools the canvas agent may call, and which of them write', 'references/canvas-adapter.md'],
      ['What a lane role does to rendering; what to call a lane', 'references/lane-roles.md + references/lane-vocabulary.md'],
      ['Write or change an audit check', 'references/audit-playbook.md'],
      ['Fork this template and change it for my org', 'references/customization.md'],
      ['Connect the app to a database; what a column means; row-level security', 'docs/connectors/supabase/database.md'],
      ["Generate a deployment's agent account from a connected database", 'docs/agents/blueprint.md'],
      ['My migration history desynced from upstream', 'docs/connectors/supabase/database.md'],
      ['Bring a backend that is not Supabase', 'references/adapter-contract.md + supabase/generated/portable-core.generated.sql'],
      ['CI went red and I do not know what the check defends', 'docs/engineering/checks.md'],
      ['Cut a release', 'docs/engineering/releasing.md'],
      ['Can I rename this / is it a breaking change?', 'docs/adr/0001-two-contract-tiers-and-a-frozen-identifier-layer.md'],
      ['Why do skills/, references/, agents/, hooks/ and scripts/ sit at the root?', 'docs/adr/0002-plugin-contract-folder-names.md'],
      ['Why does a service own its journey but share the catalog of tools and actors?', 'docs/adr/0003-a-service-owns-its-journey-and-shares-the-catalog.md'],
      ['May I move a file under references/ or skills/?', 'docs/adr/0004-reference-paths-are-a-published-interface.md'],
      ['Where does state shared across surfaces live?', 'docs/adr/0005-cross-surface-state-is-a-module-store.md'],
      ['When may a surface I am adding stop showing its skeleton?', 'docs/adr/0007-the-canvas-and-the-shell-run-on-separate-clocks.md'],
      ['Does switching a still-open view remount the canvas?', 'docs/adr/0010-open-views-stay-mounted.md'],
      ['What may a surface ask of the session?', 'docs/adr/0011-one-question-a-surface-may-ask.md'],
      ['Why is this colour token derived, and where does it part from upstream?', 'docs/adr/0008-a-primitive-is-a-hue-and-a-semantic-token-is-a-job.md'],
      ['Which axis of a text style does a rung own, and why are there two ladders?', 'docs/adr/0012-a-rung-owns-size-and-leading.md'],
      ['Where do layout numbers the runtime does math on live?', 'docs/adr/0013-typescript-owns-layout-numbers.md'],
      ['May I edit a file under src/components/ui/?', 'docs/adr/0014-vendored-primitives-stay-pristine.md'],
      ['Does focusing a scenario unmount the rest of the board?', 'docs/adr/0015-the-board-is-always-fully-mounted.md'],
      ['Why do queries never refetch on focus?', 'docs/adr/0016-reads-never-refetch-on-their-own.md'],
      ['Why are the large editor components not split?', 'docs/adr/0017-large-component-splits-wait-for-an-end-to-end-round.md'],
      ['What does featured mean on a resource?', 'docs/adr/0018-featured-is-one-column-two-verbs.md'],
      ['Is this repo a fork of a deployment, or the canonical template?', 'docs/adr/0019-the-deployment-is-a-deployment-of-the-template.md'],
      ['How does a deployment consume this template?', 'docs/adr/0020-the-deployment-imports-the-template.md'],
      ['Who owns the canvas agent, and how may a deployment tune it?', 'docs/adr/0021-the-template-owns-the-agent.md'],
      ['What decisions have been recorded, and under which numbers?', 'docs/adr/overview.md'],
      ['Add or move a document', 'docs/guidelines/documentation.md'],
      ['Propose a change; what a commit and a pull request carry', 'docs/guidelines/contributing.md'],
      ['See what is already being worked on', 'GitHub issues — the queue is not in this repo'],
      ['Where does a decision get written down, and where does work in flight live?', 'docs/adr/0009-the-queue-is-issues-and-a-durable-decision-is-an-adr.md'],
    ],

    /**
     * The `## Reading paths` list, as the markdown it renders to: one bullet
     * per kind of reader, in the order that reader should go.
     */
    readingPaths: `- **Adopting the plugin** — README → SETUP → guide/03, then \`references/\` as
  the tasks come up.
- **Deploying the template** — SETUP → docs/connectors/supabase/database.md →
  guide/04.
- **Bringing your own backend** — references/adapter-contract.md →
  supabase/generated/portable-core.generated.sql → guide/04.
- **Working on this repository** — SETUP → docs/guidelines/contributing.md →
  docs/engineering/checks.md, with docs/adr/ before anything that renames.
- **An agent, any task** — AGENTS.md (auto-loaded) → CONTEXT.md → this table.`,
  },
}
