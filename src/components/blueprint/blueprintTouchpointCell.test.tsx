// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BlueprintTouchpointCell } from '@/components/blueprint/BlueprintTouchpointCell'

afterEach(cleanup)

/** A placement whose touchpoint the registry lacks: the same face, dashed. */
describe('BlueprintTouchpointCell', () => {
  it('draws a name-only placement dashed and says so in the DOM', () => {
    const { container } = render(
      <BlueprintTouchpointCell item="Intake portal account page" nameOnly asSpan />,
    )
    const face = container.querySelector('[data-name-only]')
    expect(face).not.toBeNull()
    expect(face!.className).toContain('border-dashed')
    expect(face!.textContent).toContain('Intake portal account page')
  })

  it('draws a linked placement plainly', () => {
    const { container } = render(<BlueprintTouchpointCell item="Intake portal" asSpan />)
    expect(container.querySelector('[data-name-only]')).toBeNull()
    expect(container.querySelector('span')!.className).not.toContain('border-dashed')
  })

  // The button branch used to spread `data-name-only` onto `BlueprintCellButton`,
  // and a JSX spread is not excess-property checked: the attribute was dropped
  // on the floor, so only the read-only face ever carried the marker. `nameOnly`
  // is a declared prop, and this is what says the attribute lands.
  it('says so in the DOM on the interactive branch too', () => {
    const { container } = render(
      <BlueprintTouchpointCell item="Intake portal account page" nameOnly />,
    )
    const button = container.querySelector('button[data-name-only]')
    expect(button).not.toBeNull()
    expect(button!.className).toContain('border-dashed')
  })
})
