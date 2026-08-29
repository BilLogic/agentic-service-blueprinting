## Problem Statement

This repo is the canonical home for the four `sb` skills and the package other teams will clone, but nothing enforces either fact.

Canonical is an assertion, not a mechanism: the consumer (`uno-blueprint`) resolves this repo through a hard-coded local filesystem path, so on any machine without that checkout the drift check passes without comparing anything. Five files are drifted between the two copies right now.

Standalone is also an assertion. The package has never been swept for references to uno, PLUS, or the Slack bot, and its documentation tree does not yet follow the grammar being adopted across the estate — no root glossary, no root index, no setup document written for someone who has never heard of PLUS.

## Solution

Make canonical real: publish the skills through the git remote, and make the consumer's check fail when it cannot reach it. Then adopt the shared harness grammar — five root files, `docs/` for authored protocol, class-named folders, `overview.md` authored and `index.md` generated — while deliberately keeping the plugin contract's folder names (`skills/`, `references/`, `agents/`, `hooks/`, `scripts/`), because skills resolve them by path at runtime.

Finish by sweeping the tree for anything that assumes PLUS.

## User Stories

1. As a contributor with no PLUS context, I want the package to make sense standalone, so that I can adopt it without decoding another company's vocabulary.
2. As a plugin consumer, I want `${CLAUDE_PLUGIN_ROOT}/references/…` paths to keep resolving, so that installing the plugin does not break after a reorganisation.
3. As the maintainer, I want skills authored here and nowhere else, so that one edit reaches every consumer.
4. As a downstream repo, I want to sync skills from a git remote, so that my check works on a machine that has never cloned this repo.
5. As a downstream repo, I want an unreachable canonical source to fail my build, so that a green check means the copies actually match.
6. As a new contributor, I want a root `SETUP.md`, so that I can run the package without reading the whole guide.
7. As any agent working here, I want a root `INDEX.md` routing by task, so that I do not browse folders to find the rule I need.
8. As any agent, I want `CONTEXT.md` to define scenario, path, phase, step, cell, lane, line of visibility, trigger, need, slice, and finding, so that the domain language is fixed in one place.
9. As a reader, I want `CONTEXT.md` free of PLUS-specific terms, so that the glossary describes the method rather than one instance of it.
10. As a contributor, I want the human narrative in `docs/guide/` to link into the protocol rather than restate it, so that there is one place to change a rule.
11. As a maintainer, I want the plugin-contract folder names recorded as a deliberate exception in an ADR, so that a future tidy-up does not "fix" them.
12. As a contributor, I want the queue visible as public issues, so that I can see what is being worked on before proposing something.
13. As a maintainer, I want plans to stay in-repo as history while the queue lives in issues, so that decision-era context survives without pretending to be current.
14. As an agent, I want every doc's frontmatter to carry a summary, so that the generated index tells me whether to open it.
15. As a maintainer, I want a sweep for uno, PLUS, and uno-bot references as part of this work, so that the boundary is verified rather than assumed.
16. As a consumer of the published plugin, I want the four skills' behaviour unchanged by this work, so that adopting the fix is safe.

## Implementation Decisions

**Canonical publishing.** Skills and references remain authored here. The consumer resolves them from this repo's git remote by default; a local path stays available as an authoring override. The five drifted files are resolved here first, then synced downstream — never the reverse.

**Folder names are contract, not preference.** `skills/`, `references/`, `agents/`, `hooks/`, `scripts/` keep their names because skill text resolves them at runtime through the plugin root. This is an explicit exception to the estate's class-named-folder rule, and it gets an ADR so it reads as a decision rather than an oversight.

**Documentation tree.** Root gains `CONTEXT.md`, `SETUP.md`, `INDEX.md` alongside `README.md` and `AGENTS.md`. `docs/` gains `adr/`, `connectors/supabase`, `guidelines/`, `engineering/`; `docs/guide/` keeps its numbered narrative and links into the protocol.

**Boundary sweep.** A pass over the tree for uno, PLUS, and uno-bot references, with removal or generalisation of every hit. The bot-contract probe belongs to the instance repo and must not appear here.

**No behavioural change to the skills.** This spec makes copies identical and the package self-contained; it does not rewrite skill content. That rewrite is a separate phase.

## Testing Decisions

Good tests here assert what a consumer would observe: whether a sync reports drift, whether the package resolves its own paths, whether the skills still run.

- **Drift, from the consumer side.** Identical trees pass; an altered vendored file fails and names it; an unreachable source fails. Owned by the consumer repo's suite but specified by this contract.
- **Path resolution.** The existing checks that a skill's references resolve under the plugin root stay, and cover the exception above — they are the reason the folder names cannot change.
- **Skill behaviour unchanged.** The existing eval harness runs before and after the reorganisation; a difference in outcome means the move changed content, which it must not.
- **Boundary.** A grep-based check for uno/PLUS/uno-bot strings is cheap enough to run in CI and is the only honest way to keep the claim true over time.
- **No tests on prose.** Documentation is verified by the generated index covering every doc with a summary, not by asserting on wording.

## Out of Scope

- Rewriting the four skills or their nineteen references — content changes are their own phase with their own eval run.
- The in-app agent that consumes the vendored copies; it lives in the consumer repo.
- `plus-uno`'s harness work.
- Publishing, versioning, or marketplace listing changes for the plugin.

## Further Notes

The exception in this repo is worth stating plainly: everywhere else in the estate, folder names carry the content class, because that makes placement obvious. Here, folder names are an interface other people's installations depend on. Interface stability wins, and the ADR is what stops someone re-litigating it later.

Full audit and the decided IA for all three repos: the harness-audit artifact dated 2026-08-23, with the executable half in `docs/plans/2026-08-23-001-refactor-agent-harness-ia-plan.md`.
