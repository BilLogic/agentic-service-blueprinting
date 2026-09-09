import { describe, expect, it } from 'vitest'
import { linkedTextSegments } from '@/lib/linkedText'

/**
 * A URL inside a note, and everything that is not one.
 *
 * This carries the whole job `evidence.ref` was doing, so the interesting
 * cases are the ones where a locator-shaped string is NOT an address: a
 * filename, a citation an author typed by hand ("PR 1151"), and a scheme no
 * anchor may carry.
 */
describe('linkedTextSegments', () => {
  const links = (text: string | null) =>
    linkedTextSegments(text).filter((s) => s.kind === 'link')

  it('has nothing to say about an empty note', () => {
    expect(linkedTextSegments(null)).toEqual([])
    expect(linkedTextSegments('')).toEqual([])
  })

  it('finds a URL and keeps the sentence around it', () => {
    const segments = linkedTextSegments('See https://example.com/x for the numbers')
    expect(segments.map((s) => s.text)).toEqual([
      'See ',
      'https://example.com/x',
      ' for the numbers',
    ])
    expect(segments[1]).toMatchObject({ kind: 'link', href: 'https://example.com/x' })
  })

  it('leaves the full stop to the sentence', () => {
    expect(links('Numbers: https://example.com/x.')[0].text).toBe(
      'https://example.com/x',
    )
  })

  it('keeps a bracket the address opened', () => {
    expect(
      links('https://en.wikipedia.org/wiki/Service_blueprint_(design)')[0].text,
    ).toBe('https://en.wikipedia.org/wiki/Service_blueprint_(design)')
  })

  it('drops a bracket the sentence opened', () => {
    expect(links('(see https://example.com/x)')[0].text).toBe(
      'https://example.com/x',
    )
  })

  it('does not guess that a dotted word is an address', () => {
    expect(links('See the note in data-model.md')).toEqual([])
    expect(links('PR 1151, Card 2266, Metabase 2026-08-08')).toEqual([])
  })

  it('refuses a scheme no anchor may carry', () => {
    const text = 'javascript://example.com/x'
    expect(links(text)).toEqual([])
    expect(linkedTextSegments(text)).toEqual([{ kind: 'text', text }])
  })

  it('finds every URL in a note, not only the first', () => {
    expect(
      links('https://a.example/1 and then https://b.example/2').map((s) => s.href),
    ).toEqual(['https://a.example/1', 'https://b.example/2'])
  })
})
