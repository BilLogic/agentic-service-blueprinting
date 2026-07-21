import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { mergeSlidesWithFallback } from '@/lib/mergeSlidesWithFallback'
import {
  FALLBACK_NAV,
  getSlideViewType,
  type EditorView,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'

type EditorContextValue = {
  view: EditorView
  setView: (view: EditorView) => void
  goHome: () => void
  openDetail: (slideId: string) => void
  slides: NavItem[]
  getScenarioDisplayViewType: (slide: NavItem) => SlideViewType
  setScenarioDisplayViewType: (
    scenarioId: string,
    viewType: SlideViewType,
  ) => void
  slidesLoading: boolean
  slidesError: string | null
  activeSlideId: string
  setActiveSlideId: (id: string) => void
  activeSlide: NavItem
}

const EditorContext = createContext<EditorContextValue | null>(null)

type EditorProviderProps = {
  children: ReactNode
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [view, setView] = useState<EditorView>('home')
  const { slides: dbSlides, loading, error, configured } = useLifecyclePhases()

  const slides = useMemo(() => {
    if (dbSlides.length === 0) return FALLBACK_NAV
    return mergeSlidesWithFallback(dbSlides)
  }, [dbSlides])

  const [activeSlideId, setActiveSlideId] = useState(FALLBACK_NAV[0].id)

  const goHome = useCallback(() => {
    setView('home')
  }, [])

  const openDetail = useCallback((slideId: string) => {
    setActiveSlideId(slideId)
    setView('detail')
  }, [])

  /** Session-local display overrides on top of the stored `view_type`. */
  const [viewTypeOverrides, setViewTypeOverrides] = useState<
    Record<string, SlideViewType>
  >({})

  const getScenarioDisplayViewType = useCallback(
    (slide: NavItem): SlideViewType =>
      viewTypeOverrides[slide.id] ?? getSlideViewType(slide),
    [viewTypeOverrides],
  )

  const setScenarioDisplayViewType = useCallback(
    (scenarioId: string, viewType: SlideViewType) => {
      setViewTypeOverrides((current) =>
        current[scenarioId] === viewType
          ? current
          : { ...current, [scenarioId]: viewType },
      )
    },
    [],
  )

  useEffect(() => {
    if (slides.length === 0) return
    const exists = slides.some((s) => s.id === activeSlideId)
    if (!exists) setActiveSlideId(slides[0].id)
  }, [slides, activeSlideId])

  const activeSlide = useMemo(
    () =>
      slides.find((s) => s.id === activeSlideId) ??
      slides[0] ??
      FALLBACK_NAV[0],
    [activeSlideId, slides],
  )

  const value = useMemo(
    () => ({
      view,
      setView,
      goHome,
      openDetail,
      slides,
      getScenarioDisplayViewType,
      setScenarioDisplayViewType,
      slidesLoading: configured && loading && dbSlides.length === 0,
      slidesError: configured ? error : null,
      activeSlideId,
      setActiveSlideId,
      activeSlide,
    }),
    [
      view,
      goHome,
      openDetail,
      slides,
      getScenarioDisplayViewType,
      setScenarioDisplayViewType,
      configured,
      loading,
      error,
      activeSlideId,
      activeSlide,
      dbSlides.length,
    ],
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}
