import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/contexts/SupabaseProvider'

/**
 * Sign in, or sign out — the front-door half of the settings surface, and
 * the only half a signed-out visitor can use at all.
 *
 * Renders as a fragment into the settings column's `flex flex-col gap-2.5`:
 * these are fields, not a panel, and the column that spaces them belongs to
 * whoever composes them (AgentSettingsFields).
 *
 * Every piece of state here is auth's own — the two drafts, the busy flag,
 * the error and the link-sent line. None of it crosses into the agent's
 * provider/model/key half, which is what makes that seam a real one.
 */
export function AdminSessionFields() {
  const { client, session } = useSupabase()
  const [emailDraft, setEmailDraft] = useState('')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const signIn = () => {
    if (!client || authBusy) return
    const email = emailDraft.trim()
    if (!email || !passwordDraft) return
    setAuthBusy(true)
    setAuthError(null)
    void client.auth
      .signInWithPassword({ email, password: passwordDraft })
      .then(({ error }) => {
        setAuthBusy(false)
        if (error) {
          setAuthError(error.message)
          return
        }
        setEmailDraft('')
        setPasswordDraft('')
      })
  }

  // Magic link: sign in without a password at all. The right fit for this
  // app's hand-created admin accounts — there is no sign-up flow and no
  // set-password screen, so a mailed link that lands already authenticated
  // beats a recovery flow with nowhere to type a new password.
  // `shouldCreateUser: false` keeps it from quietly minting accounts.
  // Requires the project's Site URL / redirect allowlist to include this
  // origin — a link mailed to the default localhost Site URL goes nowhere.
  const [linkSent, setLinkSent] = useState(false)
  const sendMagicLink = () => {
    if (!client || authBusy) return
    const email = emailDraft.trim()
    if (!email) return
    setAuthBusy(true)
    setAuthError(null)
    void client.auth
      .signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: window.location.origin,
        },
      })
      .then(({ error }) => {
        setAuthBusy(false)
        if (error) {
          setAuthError(error.message)
          return
        }
        setLinkSent(true)
      })
  }

  const signOut = () => {
    if (!client || authBusy) return
    setAuthBusy(true)
    void client.auth.signOut().then(() => {
      setAuthBusy(false)
      setAuthError(null)
    })
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-2xs text-muted-foreground">
          {session.user.email ?? 'Signed in'}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={authBusy}
          onClick={signOut}
        >
          Sign out
        </Button>
      </div>
    )
  }

  return (
    <>
      <Input
        type="email"
        value={emailDraft}
        onChange={(event) => setEmailDraft(event.target.value)}
        placeholder="admin@…"
        className="h-7 text-xs"
        aria-label="Admin email"
        autoComplete="email"
      />
      <div className="flex items-center gap-2">
        <Input
          type="password"
          value={passwordDraft}
          onChange={(event) => setPasswordDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') signIn()
          }}
          placeholder="Password"
          className="h-7 min-w-0 flex-1 text-xs"
          aria-label="Admin password"
          autoComplete="current-password"
        />
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={authBusy || emailDraft.trim() === '' || passwordDraft === ''}
          onClick={signIn}
        >
          Sign in
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 justify-start px-1 text-xs text-muted-foreground"
        disabled={authBusy || emailDraft.trim() === ''}
        onClick={sendMagicLink}
      >
        Email me a sign-in link instead
      </Button>
      {authError ? (
        <p className="text-3xs leading-snug text-destructive">{authError}</p>
      ) : linkSent ? (
        <p className="text-3xs leading-snug text-muted-foreground">
          Link sent — check that inbox, then open it on this device.
        </p>
      ) : (
        <p className="text-3xs leading-snug text-muted-foreground">
          Signing in unlocks editing and the agent on this device.
        </p>
      )}
    </>
  )
}
