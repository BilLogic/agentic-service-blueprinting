import type { ReactNode } from 'react'
import { CoverCommandChip } from '@/components/cover/CoverCommandChip'
import { CoverFigure } from '@/components/cover/CoverFigure'
import { renderInline } from '@/components/cover/coverInline'
import type {
  CoverFigure as CoverFigureModel,
  CoverGuideLink,
  CoverSection,
} from '@/components/cover/coverModel'
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
      <div className="flex max-w-2xl min-w-0 flex-col gap-2">{children}</div>
      {figure ? <CoverFigure figure={figure} eager={eager} /> : null}
    </div>
  )
}

/**
 * A defs list is a two-column table, not a loose run of pairs: a header row
 * on a muted ground, bordered rows, and the term column carrying the weight.
 * Every colour is a token, so both themes follow the same rules.
 */
function DefsTable({
  columns,
  items,
}: {
  columns: { term: string; definition: string }
  items: { term: string; definition: string }[]
}) {
  return (
    <div className="max-w-2xl overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm sm:text-base">
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

  return (
    <div className="flex flex-col gap-10">
      {intro ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {renderInline(intro)}
        </p>
      ) : null}

      {sections.map((section) => {
        const eager = eagerFigures && section.figure ? figuresSeen++ === 0 : false

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
                  <div className="flex max-w-2xl min-w-0 flex-col gap-2">
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
          case 'skill':
            return (
              <section key={section.id} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CoverCommandChip
                    command={section.command}
                    copyLabel={chip.copyLabel}
                    copiedLabel={chip.copiedLabel}
                  />
                </div>
                <Paragraph>{renderInline(section.purpose)}</Paragraph>
                {section.figure ? (
                  <CoverFigure figure={section.figure} eager={eager} />
                ) : null}
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  <span className="font-semibold text-foreground">
                    {section.producesLabel}
                  </span>{' '}
                  — {renderInline(section.produces)}
                </p>
              </section>
            )
        }
      })}

      {link && repoUrl ? <GuideLink link={link} repoUrl={repoUrl} /> : null}
    </div>
  )
}
