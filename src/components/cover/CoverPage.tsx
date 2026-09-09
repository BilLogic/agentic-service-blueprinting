import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ORG_NAME } from '@/config'
import { cn } from '@/lib/utils'
import { COVER_MEASURE } from '@/components/cover/coverMeasure'
import { CoverSections } from '@/components/cover/CoverSections'
import { CoverServicesSelector } from '@/components/cover/CoverServicesSelector'
import { renderInline } from '@/components/cover/coverInline'
import { CoverTabStrip } from '@/components/cover/CoverTabStrip'
import type {
  CoverContent,
  CoverServicePage,
} from '@/components/cover/coverModel'
import type { ActiveService } from '@/contexts/ActiveServiceContext'
import { useActiveService } from '@/contexts/ActiveServiceContext'
import { useEditor } from '@/contexts/EditorContext'

/**
 * The cover page — the shell's landing view.
 *
 * Everything visible is data from a `CoverContent` module; the components
 * here own only layout and theme treatment. Tab state is local and
 * unserialized: `?slice=` deep links resolve one way, out of this page into
 * app surfaces, never into a cover tab (a second writer on the query string
 * would race the slice resolution).
 *
 * The header's button is the page's only NAVIGATING action — the one way
 * to leave the cover. Figures are click-to-expand, which is a second class
 * of button, deliberately: it never writes, fetches, or navigates, so the
 * page stays identical for a read-only visitor and in a zero-config
 * workspace whether or not a reader ever opens one.
 */
export function CoverPage({ content }: { content: CoverContent }) {
  const { enterCanvas } = useEditor()
  const { services, service, switchService } = useActiveService()
  return (
    <CoverPageView
      content={content}
      onOpenCanvas={enterCanvas}
      services={services}
      activeServiceSlug={service?.slug ?? null}
      onSelectService={switchService}
    />
  )
}

/**
 * Pick the cover page the active service shows: the one whose slug the active
 * service names (case-insensitive, the way routing resolves a slug), falling
 * back to the first page. The fallback is what keeps the single-service render
 * byte-for-byte — the sole page shows even before the slug resolves, and even
 * if the deployment's authored slug differs from the row's.
 */
function pickServicePage(
  pages: CoverServicePage[],
  activeSlug: string | null,
): CoverServicePage | undefined {
  if (activeSlug) {
    const target = activeSlug.toLowerCase()
    const match = pages.find((page) => page.slug.toLowerCase() === target)
    if (match) return match
  }
  return pages[0]
}

/**
 * The provider-free surface — tests hand it a plain callback.
 *
 * `services` is the deployment's roster. With more than one, the tab whose
 * body is the services index heads its panel with the service selector, its
 * strip label reads the plural, and the ACTIVE service's own page renders.
 * With one or none, the props default to the single-service shape and
 * the page is byte-for-byte what it was before the switcher — no selector,
 * singular label, the sole page below.
 */
export function CoverPageView({
  content,
  onOpenCanvas,
  services = [],
  activeServiceSlug = null,
  onSelectService,
}: {
  content: CoverContent
  onOpenCanvas: () => void
  services?: ActiveService[]
  activeServiceSlug?: string | null
  onSelectService?: (slug: string) => void
}) {
  const [activeTab, setActiveTab] = useState(content.tabs[0]?.value ?? '')
  const multiService = services.length > 1

  // The strip's labels: the services tab pluralizes only when a second service
  // exists; every other tab, and the single-service case, is its content label.
  const stripTabs = content.tabs.map((tab) => ({
    value: tab.value,
    label:
      multiService && 'services' in tab ? tab.services.pluralLabel : tab.label,
  }))

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-background"
      data-cover-page
    >
      <div
        /*
          The shell used to run to `max-w-5xl` while every block inside it
          — prose, tables, figures — capped at the narrower COVER_MEASURE.
          A wider outer box with narrower inner content left the readable
          column sitting flush against the shell's left edge: centered as a
          BOX, but the text inside it read as pushed left, with a dead
          margin on the right that grew with viewport width.

          One width now. `data-cover-shell` still marks this as the shell
          rather than a content block — the exemption in coverPage.test.tsx
          is about layout role, not about the two ever needing to differ
          again.
        */
        data-cover-shell
        className={cn(
          'mx-auto flex w-full flex-col px-8 py-10 sm:px-10 sm:py-12 lg:py-14',
          COVER_MEASURE,
        )}
      >
        {/*
          Title, then the sentence that explains it, THEN the way in.

          The button used to sit on the title's baseline, opposite the
          heading — which put the page's only action level with the words
          before the reader had been told what they were opening, and left
          it stranded in whitespace beside a one-line title. Reading order
          and visual order now agree: what this is, what it does, how to
          enter. It also stops the action jumping position between a short
          title and a long one.
        */}
        <header className="flex flex-col items-start gap-5 pb-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight">
              {content.title ?? ORG_NAME}
            </h1>
            <p
              className={cn(
                'text-base leading-relaxed text-muted-foreground',
                COVER_MEASURE,
              )}
            >
              {renderInline(content.lede)}
            </p>
          </div>
          <Button
            type="button"
            onClick={onOpenCanvas}
            className="h-9 shrink-0 px-3.5"
          >
            {content.primaryCtaLabel}
          </Button>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (typeof value === 'string') setActiveTab(value)
          }}
          className="gap-8"
        >
          <CoverTabStrip tabs={stripTabs} activeTab={activeTab} />
          {content.tabs.map((tab, index) => {
            // The services tab renders the active service's own page; every
            // other tab renders its fixed sections. A single-service (or
            // roster-less) deployment falls back to the sole page, unchanged.
            const tabSections =
              'services' in tab
                ? pickServicePage(tab.services.pages, activeServiceSlug)
                    ?.sections ?? []
                : tab.sections
            const sections = (
              <CoverSections
                intro={tab.intro}
                sections={tabSections}
                link={tab.link}
                repoUrl={content.repoUrl}
                commandCopy={content.commandCopy}
                eagerFigures={index === 0}
              />
            )
            // The services tab heads its panel with the selector, but only when
            // a second service makes it a choice. Otherwise the panel is its
            // sections alone — the single-service page is unchanged.
            const showSelector = multiService && 'services' in tab
            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                {showSelector ? (
                  <div className="flex flex-col gap-8">
                    <CoverServicesSelector
                      services={services}
                      activeSlug={activeServiceSlug}
                      onSelect={onSelectService ?? (() => {})}
                    />
                    {sections}
                  </div>
                ) : (
                  sections
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </div>
    </div>
  )
}
