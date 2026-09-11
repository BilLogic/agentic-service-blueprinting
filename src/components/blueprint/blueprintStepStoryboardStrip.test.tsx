// @vitest-environment jsdom
/**
 * A storyboard frame is the cell face. The 8px caption under each thumbnail
 * was the lane's short name, not authored prose, and it existed only because
 * the face was split to leave a strip for type. Removing it is how the
 * floor can rise: there is no caption left that needs 8px to fit.
 *
 * The walkthrough still names lanes (`STORYBOARD_LANE_SHORT_LABELS`);
 * this strip does not.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BlueprintStepStoryboard } from '@/components/blueprint/BlueprintStepStoryboard'

afterEach(cleanup)

const source = readFileSync(
  join(process.cwd(), 'src/components/blueprint/BlueprintStepStoryboard.tsx'),
  'utf8',
)

const FRAMES = [
  { frame: 'front.png', label: 'Front stage' },
  { frame: 'back.png', label: 'Back stage' },
  { frame: 'support.png', label: 'Support' },
]

describe('the storyboard strip has no per-frame label', () => {
  it('gives the accessible name and none of the lane captions', () => {
    render(<BlueprintStepStoryboard frames={FRAMES} />)

    expect(
      screen.getByRole('button', { name: 'Step storyboard, 3 images' }),
    ).toBeTruthy()
    expect(screen.queryByText('Front stage')).toBeNull()
    expect(screen.queryByText('Back stage')).toBeNull()
    expect(screen.queryByText('Support')).toBeNull()
  })

  it('authors no type rung below xs', () => {
    expect(source).not.toMatch(/\btext-(?:2xs|3xs|4xs|5xs)\b/)
  })
})

/*
  A rounded box inset inside another looks wrong unless its radius is the
  outer radius minus the inset. `rounded-sm` is `--radius - 4px`, a pixel
  proud of that here: invisible while the cell face is near-transparent, and
  obvious once selection paints an opaque fill behind the frame, because the
  gap pinches at the corners.

  jsdom draws no corners, so what is asserted is what the geometry follows
  from: the frame's radius is the cell's radius less 5px, and the cell still
  carries the rounding and the inset those 5px are — `p-1`'s 4px and the
  button's 1px border. Change the cell's rounding or padding and this fails,
  which is the point: the frame's radius has to change with it.
*/
describe('a frame sits concentrically inside the cell', () => {
  it('rounds the frame by the cell radius less the inset and the border', () => {
    render(<BlueprintStepStoryboard frames={['front.png']} />)
    const cell = screen.getByRole('button', { name: 'Step storyboard' })
    const frame = cell.querySelector('img') as HTMLImageElement

    expect(cell.className).toContain('rounded-lg')
    expect(cell.className).toMatch(/\bp-1\b/)
    expect(cell.className).toMatch(/(^|\s)border(\s|$)/)
    expect(frame.className).toContain('rounded-[calc(var(--radius-lg)-5px)]')
    expect(frame.className).not.toContain('rounded-sm')
  })
})
