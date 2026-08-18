// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoverCommandChip } from '@/components/cover/CoverCommandChip'

// Pins the click-to-copy chip: the command lands on the clipboard and the
// "Copied" affordance shows, while a missing or denied clipboard API leaves
// the chip inert rather than throwing (jsdom itself has no clipboard).

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CoverCommandChip', () => {
  it('copies the command and shows the Copied affordance', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CoverCommandChip command="/sb:map" copyLabel="Copy" copiedLabel="Copied" />)
    await act(async () => {
      screen.getByRole('button', { name: 'Copy /sb:map' }).click()
    })
    expect(writeText).toHaveBeenCalledWith('/sb:map')
    expect(screen.getByText('Copied')).toBeDefined()
  })

  it('a denied clipboard leaves the chip inert — no crash, no false Copied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CoverCommandChip command="/sb:audit" copyLabel="Copy" copiedLabel="Copied" />)
    await act(async () => {
      screen.getByRole('button', { name: 'Copy /sb:audit' }).click()
    })
    expect(screen.queryByText('Copied')).toBeNull()
  })

  it('no clipboard API at all (plain http) is a no-op', () => {
    render(<CoverCommandChip command="/sb:whatif" copyLabel="Copy" copiedLabel="Copied" />)
    expect(() =>
      screen.getByRole('button', { name: 'Copy /sb:whatif' }).click(),
    ).not.toThrow()
  })
})
