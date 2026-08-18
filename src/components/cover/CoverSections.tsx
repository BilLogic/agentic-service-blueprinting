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
 * Prose beside a wide figure at `lg`; stacked everywhere else. Tall figures
 * never sit beside text — a tall figure in a half-width column is unreadable.
 *
 * An absent figure is the ordinary empty-slot case: the prose renders alone,
 * full width, with nothing standing in for the missing plate.
 */
function FigurePair({
  figure,
  eager,
  children,
}: {
  figure?: CoverFigureModel
  eager?: boolean
  children: ReactNode
}) {
  if (!figure) {
    return <div className="flex max-w-2xl min-w-0 flex-col gap-2">{children}</div>
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        figure.wide &&
          'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:items-start lg:gap-8',
      )}
    >
      <div className="flex max-w-2xl min-w-0 flex-col gap-2">{children}</div>
      <CoverFigure figure={figure} eager={eager} />
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
                <FigurePair figure={section.figure} eager={eager}>
                  {section.heading ? (
                    <SectionHeading>{section.heading}</SectionHeading>
                  ) : null}
                  {section.paragraphs.map((paragraph, index) => (
                    <Paragraph key={index}>{renderInline(paragraph)}</Paragraph>
                  ))}
                </FigurePair>
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
              <section key={section.id} className="flex flex-col gap-4">
                <div className="flex max-w-2xl min-w-0 flex-col gap-2">
                  {section.heading ? (
                    <SectionHeading>{section.heading}</SectionHeading>
                  ) : null}
                  {section.intro ? (
                    <Paragraph>{renderInline(section.intro)}</Paragraph>
                  ) : null}
                </div>
                <dl className="flex max-w-2xl flex-col gap-2">
                  {section.items.map((item) => (
                    <div
                      key={item.term}
                      className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                    >
                      <dt className="w-44 shrink-0 text-sm font-semibold text-foreground sm:text-base">
                        {item.term}
                      </dt>
                      <dd className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {renderInline(item.definition)}
                      </dd>
                    </div>
                  ))}
                </dl>
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
