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
  buildVisualWalkthroughSession,
  filterWalkthroughBlueprints,
  type VisualWalkthroughSession,
} from '@/lib/visualWalkthrough'

type VisualWalkthroughContextValue = {
  session: VisualWalkthroughSession | null
  availableBlueprints: BlueprintData[]
  stepIndex: number
  isOpen: boolean
  openWalkthrough: (
    blueprint: BlueprintData,
    allBlueprints?: BlueprintData[],
  ) => void
  closeWalkthrough: () => void
  switchPath: (pathId: string) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  goToStep: (index: number) => void
}

const VisualWalkthroughContext =
  createContext<VisualWalkthroughContextValue | null>(null)

type VisualWalkthroughProviderProps = {
  children: ReactNode
  resetKey?: string
}

export function VisualWalkthroughProvider({
  children,
  resetKey,
}: VisualWalkthroughProviderProps) {
  const [session, setSession] = useState<VisualWalkthroughSession | null>(null)
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
    (blueprint: BlueprintData, allBlueprints?: BlueprintData[]) => {
      const candidates = filterWalkthroughBlueprints(
        allBlueprints?.length ? allBlueprints : [blueprint],
      )
      const activeBlueprint =
        candidates.find((item) => item.path.id === blueprint.path.id) ??
        candidates[0]
      if (!activeBlueprint) return

      const nextSession = buildVisualWalkthroughSession(activeBlueprint)
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

      const nextSession = buildVisualWalkthroughSession(blueprint)
      if (nextSession.steps.length === 0) return

      setSession(nextSession)
      setStepIndex(0)
    },
    [availableBlueprints],
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
    <VisualWalkthroughContext.Provider value={value}>
      {children}
    </VisualWalkthroughContext.Provider>
  )
}

export function useVisualWalkthrough() {
  const context = useContext(VisualWalkthroughContext)
  if (!context) {
    throw new Error(
      'useVisualWalkthrough must be used within VisualWalkthroughProvider',
    )
  }
  return context
}
