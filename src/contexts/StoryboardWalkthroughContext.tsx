import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BlueprintData } from '@/types/blueprint'
import {
  buildStoryboardWalkthroughSession,
  filterWalkthroughBlueprints,
  type StoryboardWalkthroughContextMeta,
  type StoryboardWalkthroughSession,
} from '@/lib/storyboardWalkthrough'

type StoryboardWalkthroughContextValue = {
  session: StoryboardWalkthroughSession | null
  availableBlueprints: BlueprintData[]
  stepIndex: number
  isOpen: boolean
  openWalkthrough: (
    blueprint: BlueprintData,
    allBlueprints?: BlueprintData[],
    meta?: StoryboardWalkthroughContextMeta,
  ) => void
  closeWalkthrough: () => void
  switchPath: (pathId: string) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  goToStep: (index: number) => void
}

export const StoryboardWalkthroughContext =
  createContext<StoryboardWalkthroughContextValue | null>(null)

type StoryboardWalkthroughProviderProps = {
  children: ReactNode
  resetKey?: string
}

export function StoryboardWalkthroughProvider({
  children,
  resetKey,
}: StoryboardWalkthroughProviderProps) {
  const [session, setSession] = useState<StoryboardWalkthroughSession | null>(null)
  const [availableBlueprints, setAvailableBlueprints] = useState<
    BlueprintData[]
  >([])
  const [stepIndex, setStepIndex] = useState(0)

  const closeWalkthrough = useCallback(() => {
    setSession(null)
    setAvailableBlueprints([])
    setStepIndex(0)
  }, [])

  const openWalkthrough = useCallback(
    (
      blueprint: BlueprintData,
      allBlueprints?: BlueprintData[],
      meta?: StoryboardWalkthroughContextMeta,
    ) => {
      const candidates = filterWalkthroughBlueprints(
        allBlueprints?.length ? allBlueprints : [blueprint],
      )
      const activeBlueprint =
        candidates.find((item) => item.path.id === blueprint.path.id) ??
        candidates[0]
      if (!activeBlueprint) return

      const nextSession = buildStoryboardWalkthroughSession(activeBlueprint, meta)
      if (nextSession.steps.length === 0) return

      setAvailableBlueprints(candidates)
      setSession(nextSession)
      setStepIndex(0)
    },
    [],
  )

  const switchPath = useCallback(
    (pathId: string) => {
      const blueprint = availableBlueprints.find(
        (item) => item.path.id === pathId,
      )
      if (!blueprint) return

      const nextSession = buildStoryboardWalkthroughSession(blueprint, {
        scenarioName: session?.scenarioName,
        phaseName: session?.phaseName,
      })
      if (nextSession.steps.length === 0) return

      setSession(nextSession)
      setStepIndex(0)
    },
    [availableBlueprints, session?.phaseName, session?.scenarioName],
  )

  const goToNextStep = useCallback(() => {
    setStepIndex((current) => {
      if (!session) return current
      return Math.min(current + 1, session.steps.length - 1)
    })
  }, [session])

  const goToPreviousStep = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0))
  }, [])

  const goToStep = useCallback(
    (index: number) => {
      setStepIndex((current) => {
        if (!session) return current
        const next = Math.max(0, Math.min(index, session.steps.length - 1))
        return next === current ? current : next
      })
    },
    [session],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate reset-on-key: any open walkthrough must close when the workspace changes
    closeWalkthrough()
  }, [resetKey, closeWalkthrough])

  const value = useMemo(
    () => ({
      session,
      availableBlueprints,
      stepIndex,
      isOpen: session !== null,
      openWalkthrough,
      closeWalkthrough,
      switchPath,
      goToNextStep,
      goToPreviousStep,
      goToStep,
    }),
    [
      session,
      availableBlueprints,
      stepIndex,
      openWalkthrough,
      closeWalkthrough,
      switchPath,
      goToNextStep,
      goToPreviousStep,
      goToStep,
    ],
  )

  return (
    <StoryboardWalkthroughContext.Provider value={value}>
      {children}
    </StoryboardWalkthroughContext.Provider>
  )
}

export function useStoryboardWalkthrough() {
  const context = useContext(StoryboardWalkthroughContext)
  if (!context) {
    throw new Error(
      'useStoryboardWalkthrough must be used within StoryboardWalkthroughProvider',
    )
  }
  return context
}
