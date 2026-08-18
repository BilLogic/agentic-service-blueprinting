import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ORG_NAME } from '@/config'
import { useCoverActions } from '@/components/cover/coverActions'
import { CoverSections } from '@/components/cover/CoverSections'
import { renderInline } from '@/components/cover/coverInline'
import { CoverTabStrip } from '@/components/cover/CoverTabStrip'
import type { CoverActions, CoverContent } from '@/components/cover/coverModel'

/**
 * The cover page — the shell's landing view.
 *
 * Everything visible is data from a `CoverContent` module; the components
 * here own only layout, theme treatment, and the CTA state machine. Tab
 * state is local and unserialized: `?slice=` deep links resolve one way,
 * out of this page into app surfaces, never into a cover tab (plan §4.4 —
 * a second writer on the query string would race the slice resolution).
 */
export function CoverPage({ content }: { content: CoverContent }) {
  const actions = useCoverActions()
  return <CoverPageView content={content} actions={actions} />
}

/** The provider-free surface — tests hand it a fabricated `actions`. */
export function CoverPageView({
  content,
  actions,
}: {
  content: CoverContent
  actions: CoverActions
}) {
  const [activeTab, setActiveTab] = useState(content.tabs[0]?.value ?? '')

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-y-auto bg-background"
      data-cover-page
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col px-8 py-10 sm:px-10 sm:py-12 lg:py-14">
        <header className="flex flex-col gap-3 pb-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.25rem] sm:leading-tight">
              {content.title ?? ORG_NAME}
            </h1>
            <Button
              type="button"
              onClick={actions.openCanvas}
              className="h-9 shrink-0 px-3.5"
            >
              {content.primaryCtaLabel}
            </Button>
          </div>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {renderInline(content.lede)}
          </p>
        </header>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (typeof value === 'string') setActiveTab(value)
          }}
          className="gap-8"
        >
          <CoverTabStrip tabs={content.tabs} activeTab={activeTab} />
          {content.tabs.map((tab, index) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-0">
              <CoverSections
                sections={tab.sections}
                actions={actions}
                repoUrl={content.repoUrl}
                sliceEmptyNote={content.sliceEmptyNote}
                eagerFigures={index === 0}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
