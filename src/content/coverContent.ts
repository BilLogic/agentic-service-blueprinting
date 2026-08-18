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
 * A section's `figure` is optional and an absent one is a first-class state:
 * the section renders prose-only, with no placeholder standing in for it.
 *
 * Where a figure exists it is the authored truth and the copy follows it —
 * the terms, their order, and the count all read off the drawing.
 *
 * Voice: matches `docs/guide/` — declarative, present tense, terms bolded on
 * first definition, no marketing adjectives. Copy is approved as written;
 * treat every string here as verbatim.
 */
export const coverContent: CoverContent = {
  // `title` omitted on purpose: the header falls back to ORG_NAME, which is
  // the template default "Agentic Service Blueprint".
  lede: 'A structured map of how this service is delivered — every phase, every scenario, every path variant, down to what one actor does at one moment. It is data, not a diagram: agents read it, slices are cut from it, and changes are traced through it before anyone commits.',
  primaryCtaLabel: 'Open the blueprint',
  repoUrl: 'https://github.com/BilLogic/agentic-service-blueprinting',
  chip: { copyLabel: 'Copy', copiedLabel: 'Copied' },
  states: {
    noSlices: 'No slices in this workspace yet — `/sb:slice` cuts the first one.',
  },
  tabs: [
    {
      value: 'overview',
      label: 'Overview',
      sections: [
        {
          kind: 'prose',
          id: 'overview-why',
          heading: 'Why a blueprint that stays true',
          paragraphs: [
            'Service blueprints have always been worth having and have always gone stale. They were strategic artifacts — commissioned, workshopped, opened a few times a year — because reading one took facilitation and context you had to rebuild every time. The map decayed quietly, and nothing in the week depended on it enough to force a correction.',
            'This project makes one bet: put the blueprint in a structure an agent can query, and that arithmetic changes. Interpretation stops being the expensive part, so the map gets consulted in ordinary work rather than at offsites — and because something now depends on it daily, keeping it accurate has a practical reason rather than a virtuous one.',
          ],
          figure: {
            src: '/cover/why-now.svg',
            alt: 'The same service before and after it has a reader that opens the blueprint constantly',
            width: 880,
            height: 376,
          },
        },
        {
          kind: 'defs',
          id: 'overview-when',
          heading: 'How teams use it',
          intro:
            'Four uses where the blueprint is the shortest path to an answer. They are alternatives, not a sequence — most teams start with one and grow into the rest.',
          columns: { term: 'Use', definition: 'What the blueprint gives you' },
          items: [
            {
              term: 'Onboarding',
              definition:
                'Someone new reads the whole service — every lane, every phase — before they own any part of it.',
            },
            {
              term: 'Stakeholder Alignment',
              definition:
                'Each audience is given the one view that concerns them, cut from the same source, so no two rooms are reading different pictures.',
            },
            {
              term: 'Decision Evaluation',
              definition:
                'A proposed change is traced through the dependency graph first, so what it would break is known before anyone commits to it.',
            },
            {
              term: 'Context Management',
              definition:
                'The audit roster names what has stopped holding since the service last moved, so the map is corrected rather than quietly abandoned.',
            },
          ],
          figure: {
            src: '/cover/when-to-use.svg',
            alt: 'How teams use the blueprint — onboarding, stakeholder alignment, decision evaluation, and context management',
            width: 880,
            height: 406,
          },
        },
        {
          kind: 'prose',
          id: 'overview-where',
          heading: 'Where you reach it from',
          paragraphs: [
            'Four ways to work the same blueprint. The app is where people read, compare, and present. The in-app agent drafts changes in place, using the same write path the interface uses. Agentic tools reach the same rows from an IDE or a terminal — that is where the four skills run. A chat bot answers questions and links back to the exact cell it read.',
            'All four sit on one shared context layer, so what any surface reads is what the others wrote. Who may do what follows from the account a surface signs in with, not from which surface it is.',
          ],
          figure: {
            src: '/cover/four-ways-in.svg',
            alt: 'Four ways into the blueprint — the app, the in-app agent, agentic tools, and a chat bot — over one shared context layer',
            width: 880,
            height: 334,
          },
        },
      ],
      link: {
        label: 'Learn more →',
        docPath: 'docs/guide/02-using-it-in-practice.md',
      },
    },
    {
      value: 'blueprints',
      label: 'Blueprints',
      intro:
        'Three zoom levels: what holds the blueprint, what a single path is made of, and what one cell records.',
      sections: [
        {
          kind: 'prose',
          id: 'blueprints-organized',
          heading: 'How a blueprint is organized',
          paragraphs: [
            'A **lifecycle** holds ordered **phases**, and a phase may loop back to an earlier one — which is how renewals and repeat visits are modeled without duplicating the journey. A phase holds **scenarios**: the distinct situations someone can be in. A scenario holds **paths** — variants of that same situation, the one that goes well and the ones where something does not.',
            'Every path is a grid, and that is the next zoom level.',
          ],
          figure: {
            src: '/cover/data-model-hierarchy.svg',
            alt: 'How a blueprint is organized — lifecycle to phase to scenario to path',
            width: 880,
            height: 634,
          },
        },
        {
          kind: 'prose',
          id: 'blueprints-path',
          heading: 'Inside a single path',
          paragraphs: [
            'Lanes are rows, one actor each. Steps are columns, time running left to right. A **cell** is the intersection — what that actor does at that moment. Arrows are **triggers**: one cell setting another in motion.',
            "The divider lines — **line of interaction**, **line of visibility**, **line of internal interaction** — are derived from the lanes' roles rather than drawn on top of them, so they cannot drift out of agreement with the lanes they separate. Steps are canonical per scenario and each path includes a subset in its own order, which is what makes comparing two paths exact rather than approximate.",
          ],
          figure: {
            src: '/cover/blueprint-anatomy.svg',
            alt: 'Inside a single path — lanes, steps, cells, triggers, and the derived divider lines',
            width: 880,
            height: 544,
          },
        },
        {
          kind: 'prose',
          id: 'blueprints-cell',
          heading: 'Inside a single cell',
          paragraphs: [
            "A cell is one actor's action at one step, plus the record around it: where it sits in the hierarchy; who **owns** it and who the customer *thinks* owns it, kept as two fields because the interesting case is when they differ; what it does, what form it takes, and what it is worth; the **evidence** it rests on; the resources it points at; its **dependencies** — what sets it off, what it sets off, what it needs to exist; and the slices that quote it.",
            'That last one runs both ways: open a cell and you can see which views would change if you edited it.',
          ],
          figure: {
            src: '/cover/cell-anatomy.svg',
            alt: 'Inside a single cell — placement, ownership, function, evidence, dependencies, and the slices that quote it',
            width: 880,
            height: 730,
          },
        },
      ],
      link: {
        label: 'Learn more →',
        docPath: 'docs/guide/01-the-blueprint-model.md',
      },
    },
    {
      value: 'slices',
      label: 'Slices',
      sections: [
        {
          kind: 'prose',
          id: 'slices-view',
          heading: 'A view taken out of the blueprint',
          paragraphs: [
            'A blueprint is complete by design, which makes it the wrong thing to put in front of any one person. A **slice** is a standing view cut from it: an ordered set of cells with a caption and a narrative, built for one audience and one question.',
            'A slice quotes cells rather than copying them — it keeps naming its sources. That is the difference between a view and a snapshot: when the cells move, the slice does not quietly go on claiming the old thing.',
          ],
        },
        {
          kind: 'defs',
          id: 'slices-types',
          heading: 'Five ways to slice',
          columns: { term: 'Type', definition: 'What it selects' },
          items: [
            { term: 'journey', definition: "One actor's path, end to end." },
            {
              term: 'step',
              definition: 'One step top to bottom — every lane at that moment.',
            },
            { term: 'lane', definition: 'One actor across the whole journey.' },
            { term: 'cell', definition: 'One cell in full.' },
            { term: 'custom', definition: 'Whatever the question needs.' },
          ],
          figure: {
            src: '/cover/slicing-model.svg',
            alt: 'The five slice types and what each one selects out of a path',
            width: 880,
            height: 214,
          },
        },
        {
          kind: 'prose',
          id: 'slices-reading',
          heading: 'Reading and presenting',
          paragraphs: [
            'A slice opens as its own tab beside the blueprint, so a reader can move between the view and the board it came from. The same slice runs frame by frame in presentation mode when the audience is a room rather than a person.',
            'Both states are addressable: a slice link carries its id, and a presented one carries the frame. Send someone the frame you are looking at.',
          ],
          figure: {
            src: '/cover/slice-concept.svg',
            alt: 'One path becoming a presentation — the cells a slice quotes, ordered into frames',
            width: 880,
            height: 364,
          },
        },
      ],
      link: {
        label: 'Learn more →',
        docPath: 'docs/guide/01-the-blueprint-model.md',
      },
    },
    {
      value: 'skills',
      label: 'Skills',
      sections: [
        {
          kind: 'prose',
          id: 'skills-set',
          heading: 'The skill set',
          paragraphs: [
            'The blueprint is maintained by four Claude Code skills rather than by hand. Each carries its own playbooks and scripts and links only the shared references its task needs, and each ends at a deterministic gate — a validator exit, a sign-off, a read-back that matches — rather than at "looks done".',
            'The heavy reading happens in fresh-context agents that return a summary instead of their raw material. That is deliberate: a context that never saw the drafting catches what the drafting context is anchored on.',
          ],
          figure: {
            src: '/cover/skill-architecture.svg',
            alt: 'The four skills, the resources each owns, the shared references they link, and the agents they spawn',
            width: 880,
            height: 548,
          },
        },
        {
          kind: 'skill',
          id: 'skills-map',
          command: '/sb:map',
          purpose:
            "Build a blueprint from what you already have — documents, a working session, or someone else's diagram.",
          producesLabel: 'Produces',
          produces:
            'A validated blueprint file, signed off scenario by scenario, imported into the workspace.',
          figure: {
            src: '/cover/sb-map.svg',
            alt: 'How sb:map turns documents, sessions, or a foreign diagram into a validated blueprint',
            width: 880,
            height: 292,
          },
        },
        {
          kind: 'skill',
          id: 'skills-slice',
          command: '/sb:slice',
          purpose: 'Cut the view one stakeholder needs out of the whole.',
          producesLabel: 'Produces',
          produces: 'One slice per view, still citing the cells it quotes.',
          figure: {
            src: '/cover/sb-slice.svg',
            alt: 'How sb:slice selects and orders cells into a stakeholder view',
            width: 880,
            height: 292,
          },
        },
        {
          kind: 'skill',
          id: 'skills-audit',
          command: '/sb:audit',
          purpose:
            'Run the check roster and find what is missing, conflicting, or unowned.',
          producesLabel: 'Produces',
          produces: 'Findings you triage — the audit changes nothing for you.',
          figure: {
            src: '/cover/sb-audit.svg',
            alt: 'How sb:audit runs its check roster and records findings for triage',
            width: 880,
            height: 292,
          },
        },
        {
          kind: 'skill',
          id: 'skills-whatif',
          command: '/sb:whatif',
          purpose:
            'Trace a proposed change through the dependency graph before anyone commits.',
          producesLabel: 'Produces',
          produces:
            'The cells it would reach and the assumptions it would break, worked on a copy.',
          figure: {
            src: '/cover/sb-whatif.svg',
            alt: 'How sb:whatif traces a proposed change downstream on a copy',
            width: 880,
            height: 292,
          },
        },
        {
          kind: 'prose',
          id: 'skills-outro',
          paragraphs: [
            'These run where you write code, not in this page — install the repo as a plugin and ask for what you want.',
          ],
        },
      ],
      link: { label: 'Learn more →', docPath: 'docs/guide/03-the-plugin.md' },
    },
  ],
}
