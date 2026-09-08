// @vitest-environment jsdom
import { useState, type ReactNode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { Drawer as DrawerPrimitive } from '@base-ui/react/drawer'
import { afterEach, describe, expect, it } from 'vitest'
import { ZoomableImage } from '@/components/blueprint/ZoomableImage'

/*
  Sibling stepping, and the two gestures that only exist because of touch.

  The viewer's other half — zoom, pan, the three exits, the cursor, motion —
  is pinned in `coverFigure.test.tsx`, through the adopter that has no
  siblings, and the arithmetic under all of it in `imageZoomReducer.test.ts`
  with no DOM at all. What is left over is everything a cover figure cannot
  exercise: a group, a counter, four ways to step through it, and the rule
  that a tap is not a click.

  This is the shared component's own test, not an adopter's. The six adopters
  get none: six near-identical assertions that an image opens would restate
  one fact six times, and the panels those images live in already have tests.

  jsdom lays nothing out, so every box below is stated rather than measured.
  It also has no idea what a finger is: `pointerType` is whatever the test
  says it is, which is enough to exercise the branch and is NOT enough to
  claim the gesture feels right on a phone. That part is a browser's job.
*/

afterEach(cleanup)

/** Fits at 0.5, so there is room to zoom in before any assertion about pan. */
const VIEWPORT = { width: 1000, height: 800 }
const NATURAL = { width: 2000, height: 1600 }

/**
 * Three frames of one step, in lane order — the case the whole feature is
 * for. All one size, deliberately: two frames of a step usually ARE the same
 * size, which is exactly when a step that reset the view only on a change of
 * measurement would quietly fail to reset it.
 */
const GROUP = [
  { src: '/frames/student.png', alt: 'Student', ...sized() },
  { src: '/frames/tutor.png', alt: 'Tutor', ...sized() },
  { src: '/frames/system.png', alt: 'System', ...sized() },
]

function sized() {
  return { naturalWidth: NATURAL.width, naturalHeight: NATURAL.height }
}

const CENTRE = { clientX: 500, clientY: 400 }

function stub(element: Element, values: Record<string, number>) {
  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(element, key, { value, configurable: true })
  }
}

function open({
  index = 0,
  siblings = GROUP,
}: { index?: number; siblings?: typeof GROUP } = {}) {
  const self = GROUP[index]!
  render(
    <ZoomableImage
      src={self.src}
      alt={self.alt}
      naturalWidth={NATURAL.width}
      naturalHeight={NATURAL.height}
      triggerLabel={`Expand: ${self.alt}`}
      siblings={siblings}
      siblingIndex={index}
    >
      <img src={self.src} alt="" />
    </ZoomableImage>,
  )
  const trigger = screen.getByRole('button', { name: `Expand: ${self.alt}` })
  fireEvent.click(trigger)
  return { trigger, ...mounted() }
}

/** The popup's parts, re-read — a step swaps the image inside the same box. */
function mounted() {
  const dialog = screen.getByRole('dialog')
  const box = dialog.querySelector('[data-image-zoom-viewport]')
  if (!(box instanceof HTMLElement)) {
    throw new Error('the viewer is missing its viewport box')
  }
  const image = box.querySelector('img')
  if (!(image instanceof HTMLImageElement)) {
    throw new Error('the viewer is missing its image')
  }
  stub(box, { clientWidth: VIEWPORT.width, clientHeight: VIEWPORT.height })
  fireEvent.load(image)
  return { dialog, box, image }
}

function viewport(image: HTMLElement) {
  const match =
    /translate\((-?[\d.]+)px, *(-?[\d.]+)px\) *scale\((-?[\d.]+)\)/.exec(
      image.style.transform,
    )
  if (!match) throw new Error(`unreadable transform: ${image.style.transform}`)
  return {
    offset: { x: Number(match[1]), y: Number(match[2]) },
    scale: Number(match[3]),
  }
}

/** A press, a travel and a release, from one input class or the other. */
function drag(
  image: HTMLElement,
  to: { clientX: number; clientY: number },
  pointerType = 'mouse',
) {
  fireEvent.pointerDown(image, {
    ...CENTRE,
    button: 0,
    pointerId: 1,
    pointerType,
  })
  fireEvent.pointerMove(image, { ...to, pointerId: 1, pointerType })
  fireEvent.pointerUp(image, { ...to, button: 0, pointerId: 1, pointerType })
  // The browser's click follows the release; whether the viewer acts on it is
  // part of what is being asked.
  fireEvent.click(image, { ...to, detail: 1 })
}

const counter = () => screen.getByRole('dialog').textContent

describe('ZoomableImage, a group', () => {
  it('says which of how many, and moves the count as the reader steps', () => {
    open()
    expect(counter()).toContain('1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(counter()).toContain('2 of 3')
  })

  it('opens at the sibling that was clicked, not at the head of the group', () => {
    const { image } = open({ index: 2 })
    expect(image.getAttribute('src')).toBe('/frames/system.png')
    expect(counter()).toContain('3 of 3')
  })

  it('steps in the order the rendering site supplied, which is lane order', () => {
    const { dialog } = open()
    const next = screen.getByRole('button', { name: 'Next image' })
    const seen = [mounted().image.getAttribute('src')]
    fireEvent.click(next)
    seen.push(mounted().image.getAttribute('src'))
    fireEvent.click(next)
    seen.push(mounted().image.getAttribute('src'))
    expect(seen).toEqual([
      '/frames/student.png',
      '/frames/tutor.png',
      '/frames/system.png',
    ])
    // The popup names itself after whatever it is currently showing.
    expect(dialog.getAttribute('aria-label')).toBe('System')
  })

  it('steps on the arrow keys', () => {
    const { dialog } = open()
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(mounted().image.getAttribute('src')).toBe('/frames/tutor.png')
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
  })

  it('wraps at both ends, so neither button is ever a dead control', () => {
    const { dialog } = open()
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(counter()).toContain('3 of 3')
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(counter()).toContain('1 of 3')
  })

  it('returns the view to fit on a step, even between two frames of one size', () => {
    const { dialog, image } = open()
    fireEvent.click(image, { clientX: 700, clientY: 600, detail: 1 })
    expect(viewport(image).scale).toBe(1)
    expect(viewport(image).offset).not.toEqual({ x: 0, y: 0 })

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    // Same box, same authored size — so nothing about the MEASUREMENT
    // changed, and the reset has to happen because a step happened.
    expect(viewport(mounted().image)).toEqual({ scale: 0.5, offset: { x: 0, y: 0 } })
  })

  it('escapes rather than stepping, so the keyboard exit is not captured', () => {
    const { dialog } = open()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('draws no counter and no step buttons for a lone image', () => {
    open({ siblings: [GROUP[0]!] })
    expect(counter()).not.toContain('1 of 1')
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Previous image' })).toBeNull()
  })

  it('reopens at the trigger it belongs to, not where the last visit ended', () => {
    const { trigger, dialog } = open()
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(counter()).toContain('2 of 3')
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    fireEvent.click(trigger)
    expect(counter()).toContain('1 of 3')
  })
})

describe('ZoomableImage, the swipe', () => {
  it('steps to the next sibling on a horizontal swipe at fit', () => {
    const { image } = open()
    drag(image, { clientX: 380, clientY: 400 }, 'touch')
    expect(mounted().image.getAttribute('src')).toBe('/frames/tutor.png')
  })

  it('steps back on a swipe the other way', () => {
    const { image } = open({ index: 1 })
    drag(image, { clientX: 620, clientY: 400 }, 'touch')
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
  })

  it('pans instead of stepping once the image is zoomed in', () => {
    const { image } = open()
    fireEvent.click(image, { ...CENTRE, detail: 1 })
    expect(viewport(image).scale).toBe(1)

    drag(image, { clientX: 400, clientY: 400 })
    // The picture moved and the group did not: past fit this gesture is the
    // pan, and the swipe is not allowed to take it.
    expect(viewport(image).offset.x).toBe(-100)
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
  })

  it('ignores a press that barely moved, and one that went mostly downwards', () => {
    const { image } = open()
    drag(image, { clientX: 480, clientY: 400 }, 'touch')
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')

    drag(image, { clientX: 420, clientY: 200 }, 'touch')
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
  })

  it('does not swipe an image that has no siblings', () => {
    const { image } = open({ siblings: [GROUP[0]!] })
    drag(image, { clientX: 380, clientY: 400 }, 'touch')
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
    expect(screen.getByRole('dialog')).toBeDefined()
  })
})

describe('ZoomableImage, on touch', () => {
  it('does not zoom on a tap, because a tap already means dismiss', () => {
    const { image } = open()
    fireEvent.pointerDown(image, { ...CENTRE, button: 0, pointerId: 1, pointerType: 'touch' })
    fireEvent.pointerUp(image, { ...CENTRE, button: 0, pointerId: 1, pointerType: 'touch' })
    fireEvent.click(image, { ...CENTRE, detail: 1 })
    expect(viewport(image).scale).toBe(0.5)

    // Nor on a second tap on top of it.
    fireEvent.click(image, { ...CENTRE, detail: 2 })
    fireEvent.doubleClick(image, { ...CENTRE, detail: 2 })
    expect(viewport(image).scale).toBe(0.5)
    // And the viewer is still there — the tap did nothing, rather than
    // meaning two things.
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('still zooms on a mouse click, which is a different input class', () => {
    const { image } = open()
    fireEvent.pointerDown(image, { ...CENTRE, button: 0, pointerId: 1, pointerType: 'mouse' })
    fireEvent.pointerUp(image, { ...CENTRE, button: 0, pointerId: 1, pointerType: 'mouse' })
    fireEvent.click(image, { ...CENTRE, detail: 1 })
    expect(viewport(image).scale).toBe(1)
  })

  it('zooms on a two-finger pinch, anchored between the fingers', () => {
    const { image } = open()
    const touch = { pointerType: 'touch' }
    fireEvent.pointerDown(image, { ...touch, button: 0, pointerId: 1, clientX: 400, clientY: 400 })
    fireEvent.pointerDown(image, { ...touch, button: 0, pointerId: 2, clientX: 600, clientY: 400 })
    // The fingers spread from 200px apart to 400px: twice the scale.
    fireEvent.pointerMove(image, { ...touch, pointerId: 1, clientX: 300, clientY: 400 })
    fireEvent.pointerMove(image, { ...touch, pointerId: 2, clientX: 700, clientY: 400 })
    expect(viewport(image).scale).toBe(1)

    fireEvent.pointerUp(image, { ...touch, button: 0, pointerId: 2, clientX: 700, clientY: 400 })
    fireEvent.pointerUp(image, { ...touch, button: 0, pointerId: 1, clientX: 300, clientY: 400 })
    // A pinch is not a swipe, however far the fingers travelled sideways.
    expect(mounted().image.getAttribute('src')).toBe('/frames/student.png')
  })
})

describe('ZoomableImage, the frame', () => {
  it('clips to the shape the picture is cut to, so the corners survive a zoom', () => {
    const { box, image } = open()
    const shape = /(?:^|\s)(rounded-\S+)/.exec(image.className)?.[1]
    expect(shape).toBeTruthy()

    const carried = box.className.split(/\s+/)
    // The box is the thing that does the cutting …
    expect(carried).toContain('overflow-hidden')
    // … so the box is the thing that has to carry the shape, whatever rung of
    // the radius scale that shape is later retuned to.
    expect(carried).toContain(shape)
  })
})

/*
  Opened from inside a panel.

  Everything above opens the viewer at the top of the stack, which is the case
  that never broke. A cell detail panel is itself a drawer, and a drawer and a
  dialog share one root context — so a viewer opened from inside one is a
  NESTED dialog, and Base UI suppresses a nested dialog's backdrop unless it
  is told not to. The panel below is the smallest thing that reproduces that:
  the same primitive `panelShell` uses, opened, non-modal, with the viewer
  rendered inside it.
*/

/**
 * A real click arrives at a focused button. jsdom's does not, and focus
 * RETURN has nowhere to return to unless the trigger held focus on the way
 * in — so the press is spelled out rather than left to `fireEvent.click`.
 */
function press(label: string, name: string) {
  const trigger = screen.getByRole('button', { name: label })
  act(() => trigger.focus())
  fireEvent.click(trigger)
  return { trigger, viewer: screen.getByRole('dialog', { name }) }
}

function Panel({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={setOpen}
      modal={false}
      disablePointerDismissal
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Viewport>
          <DrawerPrimitive.Popup data-panel>
            <DrawerPrimitive.Title>Cell detail</DrawerPrimitive.Title>
            {children}
          </DrawerPrimitive.Popup>
        </DrawerPrimitive.Viewport>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

function openInPanel() {
  const self = GROUP[0]!
  render(
    <Panel>
      <ZoomableImage
        src={self.src}
        alt={self.alt}
        naturalWidth={NATURAL.width}
        naturalHeight={NATURAL.height}
        triggerLabel={`Expand: ${self.alt}`}
      >
        <img src={self.src} alt="" />
      </ZoomableImage>
    </Panel>,
  )
  return press(`Expand: ${self.alt}`, self.alt)
}

/** The same image with no panel around it: one dialog on the stack. */
function openAlone() {
  const self = GROUP[0]!
  render(
    <ZoomableImage
      src={self.src}
      alt={self.alt}
      naturalWidth={NATURAL.width}
      naturalHeight={NATURAL.height}
      triggerLabel={`Expand: ${self.alt}`}
    >
      <img src={self.src} alt="" />
    </ZoomableImage>,
  )
  return press(`Expand: ${self.alt}`, self.alt)
}

const scrim = () => document.querySelector('[data-image-zoom-scrim]')
const panel = () => document.querySelector('[data-panel]')

describe('ZoomableImage, opened from inside a panel', () => {
  it('draws its scrim at the top of the stack', () => {
    openAlone()
    expect(scrim()).not.toBeNull()
  })

  it('draws its scrim from inside a panel too, where the stack is two deep', () => {
    openInPanel()
    expect(scrim()).not.toBeNull()
  })

  it('closes on Escape and leaves the panel beneath it open', () => {
    const { viewer } = openInPanel()
    fireEvent.keyDown(viewer, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Student' })).toBeNull()
    expect(panel()).not.toBeNull()
  })

  it('hands focus back to the trigger it was opened from, at either depth', async () => {
    const alone = openAlone()
    fireEvent.keyDown(alone.viewer, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(alone.trigger))
    cleanup()

    const nested = openInPanel()
    fireEvent.keyDown(nested.viewer, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(nested.trigger))
  })
})
