// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CanvasLoadProgress } from '@/components/editor/CanvasLoadProgress'
import {
  loadProgressLabel,
  loadProgressPercent,
} from '@/lib/canvasLoadProgress'

// Pins the honest-ticks rule (plan 2026-08-17-001): the fraction comes from
// completed stages only — no timer fill — with a small floor so the bar
// never reads as parked at zero.

afterEach(cleanup)

const stages = (a: boolean, b: boolean) => [
  { label: 'Loading structure…', done: a },
  { label: 'Loading blueprints…', done: b },
]

describe('loadProgressPercent', () => {
  it('floors at 8% with nothing done', () => {
    expect(loadProgressPercent(stages(false, false))).toBe(8)
  })
  it('half done is 50%', () => {
    expect(loadProgressPercent(stages(true, false))).toBe(50)
  })
  it('all done is 100%', () => {
    expect(loadProgressPercent(stages(true, true))).toBe(100)
  })
})

describe('loadProgressLabel', () => {
  it('names the earliest incomplete stage', () => {
    expect(loadProgressLabel(stages(false, false))).toBe('Loading structure…')
    expect(loadProgressLabel(stages(true, false))).toBe('Loading blueprints…')
  })
  it('all done keeps the last label (the frame the fade carries out)', () => {
    expect(loadProgressLabel(stages(true, true))).toBe('Loading blueprints…')
  })
})

describe('CanvasLoadProgress', () => {
  it('renders the width from the stage fraction and the current label', () => {
    render(<CanvasLoadProgress stages={stages(true, false)} />)
    expect(screen.getByText('Loading blueprints…')).toBeDefined()
    const fill = document.querySelector('.bg-primary') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })
})
