import type { ReactNode } from 'react'
import { StoryboardWalkthroughModal } from '@/components/blueprint/StoryboardWalkthroughModal'
import { useEditor } from '@/contexts/EditorContext'
import { StoryboardWalkthroughProvider } from '@/contexts/StoryboardWalkthroughContext'

/**
 * Provides walkthrough state to a subtree and mounts the modal beside it.
 * Keyed on the active slide, so switching slides resets an open walkthrough.
 * No active slide (a connected workspace whose phases have not arrived, or
 * which has none) is no key: there is no board to walk through, so there is
 * nothing to reset away from.
 */
export function StoryboardWalkthroughShell({ children }: { children: ReactNode }) {
  const { activeSlideId } = useEditor()

  return (
    <StoryboardWalkthroughProvider resetKey={activeSlideId ?? undefined}>
      {children}
      <StoryboardWalkthroughModal />
    </StoryboardWalkthroughProvider>
  )
}
