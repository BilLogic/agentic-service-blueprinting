import type { ReactNode } from 'react'
import { StoryboardWalkthroughModal } from '@/components/blueprint/StoryboardWalkthroughModal'
import { useEditor } from '@/contexts/EditorContext'
import { StoryboardWalkthroughProvider } from '@/contexts/StoryboardWalkthroughContext'

/**
 * Provides walkthrough state to a subtree and mounts the modal beside it.
 * Keyed on the active slide, so switching slides resets an open walkthrough.
 */
export function StoryboardWalkthroughShell({ children }: { children: ReactNode }) {
  const { activeSlideId } = useEditor()

  return (
    <StoryboardWalkthroughProvider resetKey={activeSlideId}>
      {children}
      <StoryboardWalkthroughModal />
    </StoryboardWalkthroughProvider>
  )
}
