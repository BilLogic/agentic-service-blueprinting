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
  /**
   * How much of the app went with the throw, which is the only thing the two
   * placements differ on. `'view'` is a canvas or a shell inside a working
   * app, so the message can send the reader somewhere else; `'app'` is the
   * boundary above the providers, where there is no somewhere else and the
   * honest instruction is a reload.
   *
   * A prop rather than a second component because the surface — the card, the
   * error line, the two ways back — is one design, and two copies of it is
   * two designs the moment one of them is touched.
   */
  scope?: 'view' | 'app'
}
type State = { error: Error | null }

/**
 * What the reader is told, per scope. Apart, and not inline in the JSX,
 * because the difference between the two placements is exactly this sentence
 * and putting it where it can be read side by side is what keeps it so.
 */
const MESSAGE: Record<'view' | 'app', string> = {
  view:
    'This view hit an error and stopped rendering. Try again, or move to ' +
    'another scenario — the rest of the app is still working. If it keeps ' +
    'happening on one phase or scenario, that view may be too heavy for ' +
    'this device.',
  app:
    'The app hit an error while starting, so nothing below this point came ' +
    'up. Reload the page — that is the way back from most of them. If it ' +
    'keeps happening, the line below and the browser console say what failed.',
}

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
 *
 * TWO PLACEMENTS, ONE CLASS. Inside the shells it guards a view, with the
 * chrome beside it still working. At the top of `App`, above the deployment
 * seam and the ten providers under it, it guards the start-up — a provider
 * that throws unmounts everything, so a boundary below one is a boundary that
 * catches nothing. Only the sentence differs (`scope`); the card, the error
 * line and the two ways back are the same surface, and "Try again" at the top
 * remounts the tree, which is a real retry of whatever failed to start.
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
            {MESSAGE[this.props.scope ?? 'view']}
          </p>
          <p className="w-full truncate rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
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
