import { useCallback, useEffect, useState } from 'react'
import { VisualStepDetailStack } from '@/components/blueprint/VisualStepDetailStack'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useVisualWalkthrough } from '@/contexts/VisualWalkthroughContext'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/blueprintDisplayFlags'
import type { VisualWalkthroughLayerEntry } from '@/lib/visualWalkthrough'
import { VISUAL_LAYER_SHORT_LABELS } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'

function WalkthroughStepSlide({
  step,
}: {
  step: {
    layerEntries: VisualWalkthroughLayerEntry[]
  }
}) {
  const entries = step.layerEntries.map((entry) => ({
    layerName: entry.layerName,
    label: VISUAL_LAYER_SHORT_LABELS[entry.layerName] ?? entry.layerName,
    picture: entry.picture,
    description: entry.content,
  }))

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No visuals for this step.
      </p>
    )
  }

  return (
    <VisualStepDetailStack
      entries={entries}
      orientation="horizontal"
      className="h-full"
    />
  )
}

/** Full-screen step-by-step walkthrough of a path's visuals, driven by the walkthrough context. */
export function VisualWalkthroughModal() {
  const { session, isOpen, closeWalkthrough, goToStep } = useVisualWalkthrough()
  const [api, setApi] = useState<CarouselApi>()
  const [stepIndex, setStepIndex] = useState(0)

  const onSelect = useCallback(
    (carouselApi: CarouselApi) => {
      if (!carouselApi) return
      const index = carouselApi.selectedScrollSnap()
      setStepIndex(index)
      goToStep(index)
    },
    [goToStep],
  )

  useEffect(() => {
    if (!api) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs initial state from the embla carousel (external subscription) before wiring its events
    onSelect(api)
    api.on('reInit', onSelect)
    api.on('select', onSelect)
    return () => {
      api.off('reInit', onSelect)
      api.off('select', onSelect)
    }
  }, [api, onSelect])

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rewinds to step 0 when the modal closes, alongside tearing down the key listener below
      setStepIndex(0)
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeWalkthrough()
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        api?.scrollNext()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        api?.scrollPrev()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [api, closeWalkthrough, isOpen])

  if (!isBlueprintVisualWalkthroughEnabled()) return null

  const pathName = session?.pathName.trim() ?? ''
  const scenarioName = session?.scenarioName?.trim() ?? ''
  const phaseName = session?.phaseName?.trim() ?? ''
  const hasPath = Boolean(pathName)
  const hasScenario = Boolean(scenarioName)
  const stepCrumbLabel = `Step ${stepIndex + 1}`

  return (
    <Dialog
      open={isOpen && session != null}
      onOpenChange={(open) => {
        if (!open) closeWalkthrough()
      }}
    >
      {session ? (
        <DialogContent
          data-visual-walkthrough-modal=""
          className="flex h-[min(85vh,36rem)] flex-col gap-0 overflow-hidden rounded-2xl border-border p-0 shadow-sm sm:max-w-5xl"
          aria-label="Visual walkthrough"
        >
          <DialogHeader className="shrink-0 flex-row items-center gap-2 border-b border-muted px-5 py-3.5 pr-14 text-left">
            <div className="min-w-0 flex-1">
              <DialogTitle className="sr-only">Visual walkthrough</DialogTitle>
              <DialogDescription className="sr-only">
                Presentation for {pathName || 'this path'}
              </DialogDescription>
              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="flex-nowrap gap-0.5 text-2xs leading-tight text-muted-foreground">
                  {phaseName ? (
                    <>
                      <BreadcrumbItem className="min-w-0">
                        <span className="block max-w-[5.5rem] truncate font-normal">
                          {phaseName}
                        </span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="[&>svg]:size-3" />
                    </>
                  ) : null}
                  {hasScenario ? (
                    <>
                      <BreadcrumbItem className="min-w-0">
                        <span className="block max-w-[12rem] truncate font-normal">
                          {scenarioName}
                        </span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
                    </>
                  ) : null}
                  {hasPath ? (
                    <>
                      <BreadcrumbItem className="min-w-0">
                        <span className="block max-w-[5.5rem] truncate font-normal">
                          {pathName}
                        </span>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
                    </>
                  ) : null}
                  <BreadcrumbItem className="min-w-0">
                    <BreadcrumbPage className="truncate font-medium tracking-tight text-foreground">
                      {stepCrumbLabel}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </DialogHeader>

          <div className="relative min-h-0 flex-1">
            <Carousel
              key={session.pathId}
              setApi={setApi}
              opts={{ align: 'start', loop: false }}
              className={cn(
                'h-full w-full',
                '[&_[data-slot=carousel-content]]:h-full',
                '[&_[data-slot=carousel-content]>div]:h-full',
              )}
            >
              <CarouselContent className="-ml-0 h-full">
                {session.steps.map((step) => (
                  <CarouselItem
                    key={step.stepIndex}
                    className="h-full min-h-0 basis-full pl-0"
                  >
                    <div className="h-full min-h-0 px-14 py-4">
                      <WalkthroughStepSlide step={step} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <IconTooltip label="Previous step">
                <CarouselPrevious className="left-3 size-8 rounded-full" />
              </IconTooltip>
              <IconTooltip label="Next step">
                <CarouselNext className="right-3 size-8 rounded-full" />
              </IconTooltip>
            </Carousel>
          </div>

          <DialogFooter className="shrink-0 justify-center gap-3 border-t border-muted px-5 py-3 sm:justify-center">
            <div
              className="flex items-center gap-1.5"
              role="tablist"
              aria-label="Steps"
            >
              {session.steps.map((_, index) => (
                <IconTooltip key={index} label={`Go to step ${index + 1}`}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={index === stepIndex}
                    aria-label={`Go to step ${index + 1}`}
                    className={cn(
                      'h-1.5 rounded-full bg-muted-foreground/25 transition-all',
                      index === stepIndex ? 'w-5 bg-foreground/70' : 'w-1.5',
                    )}
                    onClick={() => api?.scrollTo(index)}
                  />
                </IconTooltip>
              ))}
            </div>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
