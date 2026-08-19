import { useState } from 'react'
import type { ReactNode } from 'react'
import { CoverCommandChip } from '@/components/cover/CoverCommandChip'
import { CoverFigure } from '@/components/cover/CoverFigure'
import { renderInline } from '@/components/cover/coverInline'
import type {
  CoverFigure as CoverFigureModel,
  CoverGuideLink,
  CoverPortraitImage,
  CoverSection,
} from '@/components/cover/coverModel'
import { COVER_MEASURE } from '@/components/cover/coverMeasure'
import { cn } from '@/lib/utils'

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
      {children}
    </h3>
  )
}

function Paragraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </p>
  )
}

/**
 * One layout for every section on the page: prose first, figure below it at
 * full width. No side-by-side variant — a page that mixes the two reads as
 * two designs, and the wide figures were the only ones that ever qualified.
 *
 * An absent figure is the ordinary empty-slot case: the prose renders alone,
 * with nothing standing in for the missing plate.
 */
/**
 * Image beside text — a logomark or a framed illustration next to a
 * heading. `badge` and `framed` are the two treatments the deployments that
 * carry this section actually use; see CoverPortraitImage for why they
 * differ.
 */
function Portrait({
  image,
  heading,
  children,
}: {
  image: CoverPortraitImage
  heading?: string
  children: ReactNode
}) {
  /*
    Stacked, not side by side — side-by-side rows were tried twice and
    dropped both times, since a row split the section's width unevenly
    against every other block on the page, reading as its own small layout
    system rather than a continuation of the page's.

    Title, then the image, then the text. The heading now renders on its
    own, ahead of the image, rather than sharing a wrapper with the
    paragraphs that follow it — a portrait names what it is before it shows
    it, the same order a labeled photo reads in print.
  */
  return (
    <div className={cn('flex flex-col gap-4', COVER_MEASURE)}>
      {heading ? <SectionHeading>{heading}</SectionHeading> : null}
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        decoding="async"
        /*
          One size for both variants — this used to be size-16/20 for
          `badge` against size-32/40 for `framed`, so a logomark and an
          illustration sat on the same tab at twice the scale of each other
          with no reason a reader could see for the difference. `badge` and
          `framed` still mean different TREATMENTS (no border vs bordered
          white card, cover vs contain) — that distinction is real, since one
          asset reads on any ground and the other was authored for its own
          light one. Size was never part of what the two names meant; it was
          just left unset per variant and drifted.
        */
        className={cn(
          'size-20 shrink-0 object-cover sm:size-24',
          image.size === 'badge'
            ? 'rounded-2xl'
            : 'rounded-xl border border-border bg-white object-contain p-1',
        )}
      />
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  )
}

function FigureStack({
  figure,
  eager,
  children,
}: {
  figure?: CoverFigureModel
  eager?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className={cn('flex min-w-0 flex-col gap-2', COVER_MEASURE)}>
        {children}
      </div>
      {figure ? <CoverFigure figure={figure} eager={eager} /> : null}
    </div>
  )
}

/**
 * A defs list is a two-column table, not a loose run of pairs: a header row
 * on a muted ground, bordered rows, and the term column carrying the weight.
 * Every colour is a token, so both themes follow the same rules.
 *
 * One type rung below the page's prose (`text-xs sm:text-sm`, not
 * `text-sm sm:text-base`). A table is denser than a paragraph — two columns,
 * a header row, five-plus data rows in view at once — and running it at
 * paragraph size read heavier than the prose around it despite carrying
 * less per row. The rung below is still comfortably above the 3xs/2xs chip
 * sizes elsewhere on the page; it is one step, not a jump to caption text.
 */
function DefsTable({
  columns,
  items,
}: {
  columns: { term: string; definition: string }
  items: { term: string; definition: string }[]
}) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-lg border border-border',
        COVER_MEASURE,
      )}
    >
      <table className="w-full border-collapse text-left text-xs sm:text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th
              scope="col"
              className="border-b border-border px-4 py-2.5 font-semibold text-foreground"
            >
              {columns.term}
            </th>
            <th
              scope="col"
              className="border-b border-border px-4 py-2.5 font-semibold text-foreground"
            >
              {columns.definition}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.term}
              className={cn(index > 0 && 'border-t border-border')}
            >
              <th
                scope="row"
                className="w-44 px-4 py-3 align-top font-semibold text-foreground"
              >
                {item.term}
              </th>
              <td className="px-4 py-3 align-top leading-relaxed text-muted-foreground">
                {renderInline(item.definition)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** The guide link — quiet inline text, never a button row. */
function GuideLink({ link, repoUrl }: { link: CoverGuideLink; repoUrl: string }) {
  const href = `${repoUrl.replace(/\/+$/, '')}/blob/main/${link.docPath}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-muted-foreground underline underline-offset-4 transition-colors duration-(--motion-structural) ease-structural hover:text-foreground sm:text-base"
    >
      {link.label}
    </a>
  )
}

/** One skill's title, description, and illustration — nothing else. Shared
 * by the tabbed group below and by any lone `skill` section that is not
 * grouped into one (schema completeness; the content this repo ships always
 * groups them). */
function SkillPanel({
  section,
  chip,
  eager,
}: {
  section: Extract<CoverSection, { kind: 'skill' }>
  chip: { copyLabel: string; copiedLabel: string }
  eager: boolean
}) {
  /*
    Title, description, illustration — then the copy action, below the
    figure rather than riding on the title. The chip used to double as the
    heading, which put a click-to-copy control at the top of the panel
    where a reader's eye lands first, ahead of any reason to copy it: you
    do not know you want the command until you have read what it does and
    seen the diagram. The plain-text heading now answers "what is this",
    and the button at the bottom answers "take it with you" once the panel
    has made its case.
  */
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-mono text-lg font-semibold tracking-tight text-foreground">
        {section.command}
      </h3>
      <Paragraph>{renderInline(section.description)}</Paragraph>
      {section.figure ? (
        <CoverFigure figure={section.figure} eager={eager} />
      ) : null}
      <div>
        <CoverCommandChip
          command={section.command}
          copyLabel={chip.copyLabel}
          copiedLabel={chip.copiedLabel}
        />
      </div>
    </div>
  )
}

/**
 * The four skills as a secondary navigation, not a stacked list.
 *
 * Deliberately NOT styled like `CoverTabStrip` — an underlined row reading
 * as a second, competing set of top-level tabs would make the page look
 * like it has two navigation systems fighting for the same rank. This is a
 * segmented control instead: a pill row on a recessed track, which reads as
 * "a control that belongs to the section below it" rather than "another way
 * to leave this page."
 */
function SkillTabs({
  sections,
  chip,
  eagerFirst,
}: {
  sections: Extract<CoverSection, { kind: 'skill' }>[]
  chip: { copyLabel: string; copiedLabel: string }
  eagerFirst: boolean
}) {
  const [active, setActive] = useState(0)
  const current = sections[Math.min(active, sections.length - 1)]
  if (!current) return null

  return (
    <section className="flex flex-col gap-6">
      <div
        role="tablist"
        aria-label="Skills"
        className="flex w-fit flex-wrap gap-1 rounded-full bg-muted p-1"
      >
        {sections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={cn(
              'rounded-full px-3.5 py-1.5 font-mono text-sm transition-colors duration-(--motion-structural) ease-structural',
              index === active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {section.command}
          </button>
        ))}
      </div>
      <SkillPanel
        section={current}
        chip={chip}
        eager={eagerFirst && active === 0}
      />
    </section>
  )
}

export function CoverSections({
  intro,
  sections,
  link,
  repoUrl,
  chip,
  eagerFigures = false,
}: {
  intro?: string
  sections: CoverSection[]
  link?: CoverGuideLink
  repoUrl?: string
  chip: { copyLabel: string; copiedLabel: string }
  /** The visible-on-load tab decodes its first figure eagerly. */
  eagerFigures?: boolean
}) {
  let figuresSeen = 0

  /*
    Skills are grouped and rendered once, via the tab control below, rather
    than stacked in place — four named things in a row read better as one
    switcher than as four sections of equal weight. Everything else keeps
    its original order and rendering; only the skill sections leave the
    stack.
  */
  const otherSections = sections.filter((section) => section.kind !== 'skill')
  const skillSections = sections.filter(
    (section): section is Extract<CoverSection, { kind: 'skill' }> =>
      section.kind === 'skill',
  )

  return (
    <div className="flex flex-col gap-10">
      {intro ? (
        <p
          className={cn(
            'text-sm leading-relaxed text-muted-foreground sm:text-base',
            COVER_MEASURE,
          )}
        >
          {renderInline(intro)}
        </p>
      ) : null}

      {otherSections.map((section) => {
        // Portraits are never the eager figure: they are small and never
        // the first thing on a tab in practice, so `in` alone (no read of
        // `.image`) keeps this a plain existence check, same as `.figure`.
        const hasImage = ('figure' in section && section.figure) || 'image' in section
        const eager = eagerFigures && hasImage ? figuresSeen++ === 0 : false

        switch (section.kind) {
          case 'prose':
            return (
              <section key={section.id} className="flex flex-col gap-2">
                <FigureStack figure={section.figure} eager={eager}>
                  {section.heading ? (
                    <SectionHeading>{section.heading}</SectionHeading>
                  ) : null}
                  {section.paragraphs.map((paragraph, index) => (
                    <Paragraph key={index}>{renderInline(paragraph)}</Paragraph>
                  ))}
                </FigureStack>
              </section>
            )
          case 'figure':
            return (
              <section key={section.id} className="flex flex-col gap-4">
                {section.heading ? (
                  <SectionHeading>{section.heading}</SectionHeading>
                ) : null}
                <CoverFigure figure={section.figure} eager={eager} />
              </section>
            )
          case 'defs':
            return (
              <section key={section.id} className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div
                    className={cn('flex min-w-0 flex-col gap-2', COVER_MEASURE)}
                  >
                    {section.heading ? (
                      <SectionHeading>{section.heading}</SectionHeading>
                    ) : null}
                    {section.intro ? (
                      <Paragraph>{renderInline(section.intro)}</Paragraph>
                    ) : null}
                  </div>
                  <DefsTable columns={section.columns} items={section.items} />
                </div>
                {section.figure ? (
                  <CoverFigure figure={section.figure} eager={eager} />
                ) : null}
              </section>
            )
          case 'portrait':
            return (
              <section key={section.id}>
                <Portrait image={section.image} heading={section.heading}>
                  {section.paragraphs.map((paragraph, index) => (
                    <Paragraph key={index}>{renderInline(paragraph)}</Paragraph>
                  ))}
                </Portrait>
              </section>
            )
          // No `case 'skill'` here: `otherSections` above is filtered to
          // exclude it, and TS proves the exclusion, so a skill section
          // never reaches this switch. It always renders through
          // `SkillTabs` below instead.
        }
      })}

      {skillSections.length > 0 ? (
        <SkillTabs
          sections={skillSections}
          chip={chip}
          eagerFirst={eagerFigures && figuresSeen === 0}
        />
      ) : null}

      {link && repoUrl ? <GuideLink link={link} repoUrl={repoUrl} /> : null}
    </div>
  )
}
