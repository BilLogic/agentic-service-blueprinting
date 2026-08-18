import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import { MOTION_MICRO_MS, prefersReducedMotion } from '@/lib/motion'
import { cn } from '@/lib/utils'

type ThemeToggleProps = {
  className?: string
  size?: 'icon-sm' | 'icon-xs'
}

/**
 * Light/dark switch for the app shell.
 *
 * Renders a placeholder until mounted: `next-themes` cannot know the resolved
 * theme before hydration (it reads `localStorage` and the OS preference in an
 * effect), so painting an icon on the first pass would flash the wrong one on
 * every load for anyone not on the default. The placeholder keeps the same box
 * so the header does not reflow when the real icon arrives.
 *
 * The presentation stage is exempt — it pins `.dark` on its own subtree
 * regardless of this setting, because a projected slide is always dark.
 */
export function ThemeToggle({ className, size = 'icon-xs' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  // `resolvedTheme` is undefined until next-themes has read localStorage and
  // the OS preference, which is exactly the "not yet known" signal we need —
  // no mount flag, and therefore no setState in an effect.
  const mounted = resolvedTheme !== undefined
  const isDark = resolvedTheme === 'dark'

  return (
    <IconTooltip
      label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      side="right"
    >
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={cn(
          'shrink-0 text-muted-foreground hover:text-foreground',
          className,
        )}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        disabled={!mounted}
      >
        {/*
         * The icon swap is a mount/unmount, so the outgoing glyph needs an exit
         * animation — the one thing a CSS transition cannot express, and the
         * reason framer-motion is here rather than another keyframe. Duration is
         * the shared micro-interaction value, and reduced motion collapses it to
         * a plain swap.
         */}
        <span className="relative grid size-3.5 place-items-center">
          <AnimatePresence initial={false} mode="popLayout">
            {mounted ? (
              <motion.span
                key={isDark ? 'sun' : 'moon'}
                className="absolute inset-0 grid place-items-center"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
                transition={{
                  duration: prefersReducedMotion() ? 0 : MOTION_MICRO_MS / 1000,
                  ease: 'easeOut',
                }}
              >
                {isDark ? (
                  <Sun className="size-3.5" aria-hidden />
                ) : (
                  <Moon className="size-3.5" aria-hidden />
                )}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </Button>
    </IconTooltip>
  )
}
