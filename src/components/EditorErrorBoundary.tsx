import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  children: ReactNode
  /**
   * Changing this clears the error. Pass whatever identifies "where the user
   * is" — the mobile surface + scenario, the active desktop tab — so that
   * navigating away from a broken view is enough to recover.
   */
  resetKey?: string
}
type State = { error: Error | null }

/**
 * A last line before the white screen.
 *
 * The editor is a large, always-mounted canvas; a throw anywhere in it used
 * to unmount the whole tree with no fallback, so a bug — or a mobile tab
 * running out of memory mid-render — showed the user a blank page. This
 * keeps a designed surface on screen and a way back, and logs the error
 * where a human can find it. A true OOM still kills the tab (nothing in JS
 * can catch that), but every recoverable throw now degrades instead of
 * disappearing.
 *
 * Recovery matters as much as the fallback. This app has no router, so
 * without a reset a single throw would persist until a manual reload and
 * every gesture afterwards would appear dead — one bug reading as "the app
 * crashes constantly". Two ways back: `resetKey` clears the error when the
 * user navigates, and "Try again" re-renders in place, which keeps the agent
 * session and view state that a reload would discard.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[editor] uncaught error:', error, info.componentStack)
  }

  componentDidUpdate(prev: Props): void {
    if (this.state.error !== null && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-background p-8">
        <div className="flex max-w-md flex-col items-start gap-3 rounded-lg border border-border bg-card p-6 shadow-sm">
          <h1 className="text-base font-semibold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground">
            This view hit an error and stopped rendering. Try again, or move to
            another scenario — the rest of the app is still working. If it keeps
            happening on one phase or scenario, that view may be too heavy for
            this device.
          </p>
          <p className="w-full truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
            {error.message}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </div>
        </div>
      </div>
    )
  }
}
