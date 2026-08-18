import type { ReactNode } from 'react'
import { VisualWalkthroughModal } from '@/components/blueprint/VisualWalkthroughModal'
import { useEditor } from '@/contexts/EditorContext'
import { VisualWalkthroughProvider } from '@/contexts/VisualWalkthroughContext'

/**
 * Provides walkthrough state to a subtree and mounts the modal beside it.
 * Keyed on the active slide, so switching slides resets an open walkthrough.
 */
export function VisualWalkthroughShell({ children }: { children: ReactNode }) {
  const { activeSlideId } = useEditor()

  return (
    <VisualWalkthroughProvider resetKey={activeSlideId}>
      {children}
      <VisualWalkthroughModal />
    </VisualWalkthroughProvider>
  )
}
