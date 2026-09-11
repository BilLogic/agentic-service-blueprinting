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
