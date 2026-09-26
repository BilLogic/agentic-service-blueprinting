// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CoverCommandCopy } from '@/components/cover/CoverCommandCopy'

// Pins the click-to-copy control: the command lands on the clipboard and the
// "Copied" affordance shows, while a missing or denied clipboard API leaves
// the control inert rather than throwing (jsdom itself has no clipboard).

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CoverCommandCopy', () => {
  it('copies the command and shows the Copied affordance', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CoverCommandCopy command="/ub:map" copyLabel="Copy" copiedLabel="Copied" />)
    await act(async () => {
      screen.getByRole('button', { name: 'Copy /ub:map' }).click()
    })
    expect(writeText).toHaveBeenCalledWith('/ub:map')
    expect(screen.getByText('Copied')).toBeDefined()
  })

  it('a denied clipboard leaves the control inert — no crash, no false Copied', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })

    render(<CoverCommandCopy command="/ub:audit" copyLabel="Copy" copiedLabel="Copied" />)
    await act(async () => {
      screen.getByRole('button', { name: 'Copy /ub:audit' }).click()
    })
    expect(screen.queryByText('Copied')).toBeNull()
  })

  it('no clipboard API at all (plain http) is a no-op', () => {
    render(<CoverCommandCopy command="/ub:whatif" copyLabel="Copy" copiedLabel="Copied" />)
    expect(() =>
      screen.getByRole('button', { name: 'Copy /ub:whatif' }).click(),
    ).not.toThrow()
  })
})
