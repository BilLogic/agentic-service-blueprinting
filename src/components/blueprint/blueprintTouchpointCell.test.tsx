// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BlueprintTouchpointCell } from '@/components/blueprint/BlueprintTouchpointCell'

afterEach(cleanup)

/** #112 — a name-only placement is the same face, dashed. */
describe('BlueprintTouchpointCell', () => {
  it('draws a name-only placement dashed and says so in the DOM', () => {
    const { container } = render(
      <BlueprintTouchpointCell item="Handshake Employer Profile" nameOnly asSpan />,
    )
    const face = container.querySelector('[data-name-only]')
    expect(face).not.toBeNull()
    expect(face!.className).toContain('border-dashed')
    expect(face!.textContent).toContain('Handshake Employer Profile')
  })

  it('draws a linked placement plainly', () => {
    const { container } = render(<BlueprintTouchpointCell item="Handshake" asSpan />)
    expect(container.querySelector('[data-name-only]')).toBeNull()
    expect(container.querySelector('span')!.className).not.toContain('border-dashed')
  })
})
