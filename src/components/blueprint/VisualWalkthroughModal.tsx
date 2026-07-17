import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { BlueprintStepVisual } from '@/components/blueprint/BlueprintStepVisual'
import { WalkthroughPathSelect } from '@/components/blueprint/WalkthroughPathSelect'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVisualWalkthrough } from '@/contexts/VisualWalkthroughContext'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/blueprintDisplayFlags'
import { getBlueprintLayerStyle } from '@/lib/blueprintTheme'
import type { VisualWalkthroughLayerEntry } from '@/lib/visualWalkthrough'
import { VISUAL_LAYER_SHORT_LABELS } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'

function WalkthroughLayerPanel({ entry }: { entry: VisualWalkthroughLayerEntry }) {
  const layerStyle = getBlueprintLayerStyle(entry.layerName, 'frontstage')
  const label = VISUAL_LAYER_SHORT_LABELS[entry.layerName] ?? entry.layerName

  return (
    <div
      className="overflow-hidden rounded-lg ring-1 ring-border/50"
      style={{ backgroundColor: layerStyle.lane }}
    >
      <p className="border-b border-border/40 px-3 py-1.5 text-xs font-medium text-foreground/90">
        {label}
      </p>
      <p
        className={cn(
          'px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
          entry.content ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {entry.content || '—'}
      </p>
    </div>
  )
}

function WalkthroughStepSlide({
  step,
}: {
  step: {
    pictures: string[]
    layerEntries: VisualWalkthroughLayerEntry[]
  }
}) {
  const entryCount = step.layerEntries.length

  return (
    <div className="flex flex-col gap-3">
      <BlueprintStepVisual pictures={step.pictures} presentation />

      {entryCount > 0 ? (
        <div
          className={cn(
            'grid grid-cols-1 gap-2',
            entryCount === 2 && 'sm:grid-cols-2',
            entryCount >= 3 && 'sm:grid-cols-3',
          )}
        >
          {step.layerEntries.map((entry) => (
            <WalkthroughLayerPanel key={entry.layerName} entry={entry} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function VisualWalkthroughModal() {
  const {
    session,
    availableBlueprints,
    stepIndex,
    isOpen,
    closeWalkthrough,
    switchPath,
    goToNextStep,
    goToPreviousStep,
    goToStep,
  } = useVisualWalkthrough()

  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const goToStepRef = useRef(goToStep)
  goToStepRef.current = goToStep

  useEffect(() => {
    if (!carouselApi) return

    const onSelect = () => {
      goToStepRef.current(carouselApi.selectedScrollSnap())
    }

    onSelect()
    carouselApi.on('select', onSelect)
    return () => {
      carouselApi.off('select', onSelect)
    }
  }, [carouselApi])

  useEffect(() => {
    if (!carouselApi || !isOpen) return
    if (carouselApi.selectedScrollSnap() !== stepIndex) {
      carouselApi.scrollTo(stepIndex)
    }
  }, [carouselApi, isOpen, stepIndex])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeWalkthrough()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNextStep()
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPreviousStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeWalkthrough, goToNextStep, goToPreviousStep, isOpen])

  const currentStep = session?.steps[stepIndex]
  const stepCount = session?.steps.length ?? 0
  const atFirstStep = stepIndex === 0
  const atLastStep = stepIndex >= stepCount - 1

  if (!isBlueprintVisualWalkthroughEnabled()) return null

  return (
    <Dialog
      open={isOpen && session != null}
      onOpenChange={(open) => {
        if (!open) closeWalkthrough()
      }}
    >
      {session && currentStep ? (
        <DialogContent
          data-visual-walkthrough-modal=""
          className="flex max-h-[min(90vh,38rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          aria-label="Visual walkthrough"
        >
          <DialogHeader className="gap-1 border-b px-6 py-4 pr-14">
            <WalkthroughPathSelect
              blueprints={availableBlueprints}
              value={session.pathId}
              onChange={switchPath}
            />
            <DialogTitle className="text-base">{currentStep.stepName}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <Carousel
              key={session.pathId}
              setApi={setCarouselApi}
              opts={{ startIndex: stepIndex, loop: false }}
            >
              <CarouselContent className="ml-0">
                {session.steps.map((step) => (
                  <CarouselItem key={step.stepIndex} className="pl-0">
                    <WalkthroughStepSlide step={step} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>

          <DialogFooter className="justify-center gap-3 border-t px-6 py-3 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={atFirstStep}
              onClick={goToPreviousStep}
              aria-label="Previous step"
            >
              <ArrowLeft />
            </Button>

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Steps">
              {session.steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  role="tab"
                  aria-selected={index === stepIndex}
                  aria-label={`Step ${index + 1}`}
                  className={cn(
                    'h-1.5 rounded-full bg-muted-foreground/25 transition-all',
                    index === stepIndex ? 'w-5 bg-foreground/70' : 'w-1.5',
                  )}
                  onClick={() => goToStep(index)}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={atLastStep}
              onClick={goToNextStep}
              aria-label="Next step"
            >
              <ArrowRight />
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
