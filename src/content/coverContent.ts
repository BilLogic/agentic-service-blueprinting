import type { CoverContent } from '@/components/cover/coverModel'

/**
 * The template's cover-page content — every user-facing string on the
 * landing view lives here, not in the components. A deployment replaces
 * this module (labels, copy, figures, links) without touching a renderer.
 *
 * Figure dimensions are each SVG's viewBox width and height, so the page
 * reserves the right box before the image decodes. The files themselves are
 * authored once in `docs/assets/` and copied to `public/cover/` by
 * `scripts/sync-cover-assets.mjs` at predev/prebuild.
 *
 * Voice: matches `docs/guide/` — declarative, present tense, terms bolded on
 * first definition, no marketing adjectives. Fixture references stay generic
 * ("the sample workspace"): the shipped fixture is a placeholder a team
 * replaces, so the copy must not depend on its particulars.
 */
export const coverContent: CoverContent = {
  lede: 'A structured map of how this service is delivered — every phase, every scenario, every path variant, down to what one actor does at one moment. It is data, not a diagram: agents read it, slices are cut from it, and changes are traced through it before anyone commits.',
  primaryCtaLabel: 'Open the blueprint',
  repoUrl: 'https://github.com/BilLogic/agentic-service-blueprinting',
  sliceEmptyNote:
    'No slices in this workspace yet — `sb:slice` creates the first one.',
  tabs: [
    {
      value: 'overview',
      label: 'Overview',
      sections: [
        {
          kind: 'prose',
          id: 'overview-hypothesis',
          heading: 'The hypothesis',
          paragraphs: [
            'A **service blueprint** maps how a service is delivered over time: what happens at each step, who does it, what the customer sees, and what runs underneath. Blueprints have always been valuable and always gone stale — they were strategic artifacts opened a few times a year, because interpreting one took facilitation and built-up context.',
            'The bet this project makes: put the blueprint in a queryable structure an agent can read, and the economics flip. Every cell becomes a record with an owner, evidence, and dependencies; the diagram in the canvas is a rendering of that data, not the artifact itself.',
          ],
        },
        {
          kind: 'prose',
          id: 'overview-why-now',
          heading: 'Why now',
          figure: {
            src: '/cover/why-now.svg',
            alt: 'Why teams need a service blueprint — the same service before and after it has a reader that opens it constantly',
            width: 880,
            height: 376,
          },
          paragraphs: [
            'The same service, before and after it has a reader that consults it constantly. An agent grounds every recommendation in the whole journey at zero interpretation cost — and because something now depends on the blueprint daily, there is a practical reason to keep it accurate. The maintenance loop feeds itself.',
          ],
        },
        {
          kind: 'defs',
          id: 'overview-uses',
          heading: 'When and where a team uses it',
          items: [
            {
              term: 'Read',
              definition:
                'onboard someone to how the service actually works, lane by lane.',
            },
            {
              term: 'Compare',
              definition:
                'hold the happy path against the exception path on one step axis.',
            },
            {
              term: 'Present',
              definition:
                'run a slice frame-by-frame in a meeting instead of a deck.',
            },
            {
              term: 'Decide',
              definition:
                'trace a proposed change through the dependency graph first.',
            },
            {
              term: 'Audit',
              definition:
                'run the check roster when the service shifts under the map.',
            },
          ],
        },
        {
          kind: 'prose',
          id: 'overview-ways-in',
          heading: 'The four ways in',
          figure: {
            src: '/cover/four-ways-in.svg',
            alt: 'Ways into the blueprint — the app, the in-app agent, agentic tools, and the chat bot, over one shared context layer',
            width: 880,
            height: 334,
            wide: true,
          },
          paragraphs: [
            'The app is where people read, compare, and present. The in-app agent drafts changes in place. Agentic tools reach the same rows from an IDE or a CLI — the four skills. A chat bot answers questions and links back to the exact cell it is citing.',
            'One shared context layer sits under all four, so what any surface reads is what the others wrote. Who may do what follows from the account each surface uses.',
          ],
        },
        {
          kind: 'cta',
          id: 'overview-cta',
          items: [
            { kind: 'openCanvas', label: 'Open the blueprint' },
            {
              kind: 'link',
              label: 'Using it in practice',
              docPath: '/blob/main/docs/guide/02-using-it-in-practice.md',
            },
          ],
        },
      ],
    },
    {
      value: 'blueprints',
      label: 'Blueprints',
      sections: [
        {
          kind: 'prose',
          id: 'blueprints-hierarchy',
          heading: 'How a blueprint is organized',
          figure: {
            src: '/cover/data-model-hierarchy.svg',
            alt: 'How a blueprint is organized — lifecycle to phase to scenario to path',
            width: 880,
            height: 634,
          },
          paragraphs: [
            'A **lifecycle** holds ordered **phases**; a phase may loop back to an earlier one, which is how renewals and repeat visits are modelled without duplicating the journey. A phase holds **scenarios** — the distinct situations someone can be in. A scenario holds **paths**: variants of the same situation, the happy one and the ones where something goes wrong. Each path is a grid of lanes and steps.',
            'The sample workspace maps this structure end to end — open it and the chain above is what you are navigating.',
          ],
        },
        {
          kind: 'prose',
          id: 'blueprints-path',
          heading: 'Inside a single path',
          figure: {
            src: '/cover/blueprint-anatomy.svg',
            alt: 'Inside a single path — lanes, steps, cells, triggers, and the interaction and visibility lines',
            width: 880,
            height: 544,
          },
          paragraphs: [
            'Lanes are rows, one actor each. Steps are columns — time, left to right. A **cell** is the intersection: what one actor does at one moment. Triggers are the arrows between cells. The two divider lines — the **line of interaction**, where users meet the service, and the **line of visibility**, below which users cannot see — are derived from lane roles rather than drawn, so they cannot drift out of agreement with the lanes they separate.',
            'Steps are canonical per scenario, and each path orders a subset of them — which is what makes side-by-side comparison exact rather than approximate.',
          ],
        },
        {
          kind: 'prose',
          id: 'blueprints-cell',
          heading: 'Inside a single cell',
          figure: {
            src: '/cover/cell-anatomy.svg',
            alt: 'Inside a single cell — its placement, owner and perceived owner, function, form, value, evidence, resources, dependencies, and the slices it appears in',
            width: 880,
            height: 730,
          },
          paragraphs: [
            'One actor’s action at one step, plus the record around it, walked in the figure’s own order: where it sits (phase, scenario, path, step); its **owner** and **perceived owner**, kept apart because the interesting case is when they differ; function, form, and value; the evidence it rests on; the resources it uses; its dependencies — what sets it off, what it sets off, what it needs; and the slices it appears in.',
          ],
        },
        {
          kind: 'cta',
          id: 'blueprints-cta',
          items: [
            { kind: 'openCanvas', label: 'Open the blueprint' },
            {
              kind: 'link',
              label: 'The blueprint model',
              docPath: '/blob/main/docs/guide/01-the-blueprint-model.md',
            },
          ],
        },
      ],
    },
    {
      value: 'slices',
      label: 'Slices',
      sections: [
        {
          kind: 'prose',
          id: 'slices-what',
          heading: 'A view taken out of the blueprint',
          paragraphs: [
            'A blueprint is complete by design, which makes it the wrong thing to put in front of one stakeholder. A **slice** is a standing view cut from it — an ordered set of cells with a caption and a narrative — that still points back at the cells it quotes. When cells change, the slice is not silently stale: it names its sources.',
          ],
        },
        {
          kind: 'defs',
          id: 'slices-types',
          heading: 'Five ways to slice',
          figure: {
            src: '/cover/slicing-model.svg',
            alt: 'Five ways to slice a blueprint — journey, step, lane, cell, and custom — and the presentation frame each slice can be run through',
            width: 880,
            height: 474,
          },
          items: [
            { term: 'journey', definition: 'one actor’s path, end to end' },
            {
              term: 'step',
              definition: 'one step top to bottom, every lane at that moment',
            },
            { term: 'lane', definition: 'one actor across the whole journey' },
            { term: 'cell', definition: 'one cell in full' },
            { term: 'custom', definition: 'whatever the question needs' },
          ],
        },
        {
          kind: 'prose',
          id: 'slices-presenting',
          heading: 'Reading and presenting',
          paragraphs: [
            'A slice opens as its own tab beside the blueprint, and the same slice runs frame-by-frame in presentation mode for a meeting — the presentation frame in the figure above. Both are links: a slice URL carries `?slice=`, and a presented one carries `&mode=present&frame=`.',
          ],
        },
        {
          kind: 'cta',
          id: 'slices-cta',
          items: [
            { kind: 'openSlice', label: 'Open a slice' },
            { kind: 'presentSlice', label: 'Present it' },
          ],
        },
      ],
    },
    {
      value: 'skills',
      label: 'Skills',
      sections: [
        {
          kind: 'prose',
          id: 'skills-lead',
          paragraphs: [
            'The blueprint is maintained by four Claude Code skills rather than by hand. Install the repo as a plugin and ask for what you want; each skill ends at a deterministic gate, not at "looks done".',
          ],
        },
        {
          kind: 'skill',
          id: 'skills-map',
          command: '/sb:map',
          purpose:
            'Build a blueprint from what you already have — documents, a working session, or someone else’s diagram.',
          figure: {
            src: '/cover/sb-map.svg',
            alt: 'sb:map — from source documents, a working session, or a foreign diagram to one validated blueprint file',
            width: 880,
            height: 292,
          },
          producesLabel: 'Produces',
          produces:
            'a validated blueprint file, signed off per scenario, imported to the workspace.',
        },
        {
          kind: 'skill',
          id: 'skills-slice',
          command: '/sb:slice',
          purpose: 'Cut the view one stakeholder needs out of the whole.',
          figure: {
            src: '/cover/sb-slice.svg',
            alt: 'sb:slice — from the whole blueprint to the standing view one stakeholder needs',
            width: 880,
            height: 292,
          },
          producesLabel: 'Produces',
          produces: 'one slice per view, still citing its cells.',
        },
        {
          kind: 'skill',
          id: 'skills-audit',
          command: '/sb:audit',
          purpose:
            'Run the check roster; find what is missing, conflicting, or unowned.',
          figure: {
            src: '/cover/sb-audit.svg',
            alt: 'sb:audit — the check roster run against the blueprint, each check in a fresh context, returning findings',
            width: 880,
            height: 292,
          },
          producesLabel: 'Produces',
          produces: 'findings you triage — nothing is changed for you.',
        },
        {
          kind: 'skill',
          id: 'skills-whatif',
          command: '/sb:whatif',
          purpose:
            'Trace a proposed change through the dependency graph before anyone commits.',
          figure: {
            src: '/cover/sb-whatif.svg',
            alt: 'sb:whatif — a proposed change traced through the dependency graph on a copy of the blueprint',
            width: 880,
            height: 292,
          },
          producesLabel: 'Produces',
          produces:
            'the cells it would reach and the assumptions it would break, on a copy.',
        },
        {
          kind: 'prose',
          id: 'skills-architecture',
          heading: 'How they are built',
          figure: {
            src: '/cover/skill-architecture.svg',
            alt: 'The skill set and agent fleet — four skills with their own resources, the shared references each links, and the agents they spawn',
            width: 880,
            height: 548,
          },
          paragraphs: [
            'Each skill carries its own playbooks and scripts, linking only the shared references its task needs; the heavy reading happens in fresh-context agents that return a summary rather than their raw material. A context that never saw the drafting catches what the drafting context is anchored on.',
          ],
        },
        {
          kind: 'cta',
          id: 'skills-cta',
          items: [
            {
              kind: 'link',
              label: 'The plugin',
              docPath: '/blob/main/docs/guide/03-the-plugin.md',
            },
          ],
        },
      ],
    },
  ],
}
