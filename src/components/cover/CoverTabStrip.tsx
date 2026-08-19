import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CoverTab } from '@/components/cover/coverModel'
import { cn } from '@/lib/utils'

/*
 * Edge-fade masks for an overflowing tab list — the same signal TabStrip.tsx
 * uses: content is clipped where the fade is, so there is more that way. No
 * scrollbar, which would put chrome on an orientation page.
 */
const MASK_BOTH =
  '[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]'
const MASK_START =
  '[mask-image:linear-gradient(to_right,transparent,black_1.5rem)]'
const MASK_END =
  '[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]'

/**
 * The line-variant tab list with the animated shared indicator, lifted from
 * the landing page it replaces. Two additions for a four-label strip: the
 * list scrolls horizontally when the labels do not fit (edge-fade instead of
 * a scrollbar), and the indicator recomputes on scroll as well as resize —
 * its math reads live rects, so a scrolled list would otherwise strand it.
 */
export function CoverTabStrip({
  tabs,
  activeTab,
}: {
  tabs: Pick<CoverTab, 'value' | 'label'>[]
  activeTab: string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef(new Map<string, HTMLElement>())
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false })
  const [overflow, setOverflow] = useState({ start: false, end: false })

  const setTriggerRef = useCallback(
    (value: string) => (node: HTMLElement | null) => {
      if (node) triggerRefs.current.set(value, node)
      else triggerRefs.current.delete(value)
    },
    [],
  )

  const update = useCallback(() => {
    const list = listRef.current
    if (!list) return

    const trigger = triggerRefs.current.get(activeTab)
    if (trigger) {
      const listRect = list.getBoundingClientRect()
      const triggerRect = trigger.getBoundingClientRect()
      setIndicator({
        // Offset within the scroll content, not the viewport — the indicator
        // is absolutely positioned inside the scrolling list, so it must
        // travel with the triggers.
        left: triggerRect.left - listRect.left + list.scrollLeft,
        width: triggerRect.width,
        ready: true,
      })
    }

    const scrollable = list.scrollWidth - list.clientWidth > 1
    setOverflow({
      start: scrollable && list.scrollLeft > 1,
      end: scrollable && list.scrollLeft < list.scrollWidth - list.clientWidth - 1,
    })
  }, [activeTab])

  useLayoutEffect(() => {
    update()
  }, [update])

  useEffect(() => {
    const list = listRef.current
    if (!list) return

    const observer = new ResizeObserver(() => update())
    observer.observe(list)
    for (const trigger of triggerRefs.current.values()) {
      observer.observe(trigger)
    }

    list.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      list.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  return (
    <TabsList
      ref={listRef}
      variant="line"
      className={cn(
        'relative h-auto w-full justify-start gap-6 overflow-x-auto rounded-none border-b border-border p-0',
        // Hide any scrollbar the platform still paints; the fade is the signal.
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        // This is the one horizontally-scrolling surface on an otherwise
        // vertically-scrolling page. A trackpad's "vertical" scroll gesture
        // carries a small deltaX along with deltaY from ordinary hand
        // movement; without containment, a browser can spend that stray
        // deltaX walking the strip's own scroll position while the page
        // scrolls past it, which reads as the tab labels twitching
        // sideways mid-scroll rather than as clean vertical motion. `-x`
        // only: the page's own vertical scroll must still chain normally.
        'overscroll-x-contain',
        overflow.start && overflow.end && MASK_BOTH,
        overflow.start && !overflow.end && MASK_START,
        !overflow.start && overflow.end && MASK_END,
      )}
    >
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          ref={setTriggerRef(tab.value)}
          value={tab.value}
          className={cn(
            'h-auto flex-none rounded-none px-0 pb-3 pt-0 text-sm font-medium',
            'text-muted-foreground transition-colors duration-(--motion-structural) ease-structural',
            'hover:text-foreground data-active:text-foreground',
            // Hide the default after-underline; we animate a shared indicator instead.
            'after:hidden',
          )}
        >
          {tab.label}
        </TabsTrigger>
      ))}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute bottom-[-1px] h-0.5 bg-foreground',
          'transition-[left,width,opacity] duration-(--motion-structural) ease-structural motion-reduce:transition-none',
          indicator.ready ? 'opacity-100' : 'opacity-0',
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
    </TabsList>
  )
}
