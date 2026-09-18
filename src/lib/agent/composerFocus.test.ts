// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { focusAgentComposer } from '@/lib/agent/composerFocus'
import { sourceOf } from '@/lib/sourceTree'

/**
 * The helper finds the composer by attribute, so the attribute is half the
 * contract and lives in another file. Both halves are pinned here: the
 * behaviour against a hand-built field, and the fact that the module rendering
 * the composer's field still writes the attribute the selector looks for.
 * Renaming it would otherwise break the phone's "keep typing after a jump"
 * criterion with a green suite.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Put a composer in the document.
 *
 * @param options.attributed - carry `data-agent-composer`
 * @param options.disabled - render it disabled, as an unkeyed panel does
 * @returns the field
 */
function mountComposer({
  attributed = true,
  disabled = false,
}: { attributed?: boolean; disabled?: boolean } = {}) {
  const field = document.createElement('textarea')
  if (attributed) field.setAttribute('data-agent-composer', '')
  field.disabled = disabled
  document.body.append(field)
  return field
}

describe('focusAgentComposer', () => {
  it('gives the caret to a mounted composer', () => {
    const field = mountComposer()

    expect(focusAgentComposer()).toBe(true)
    expect(document.activeElement).toBe(field)
  })

  it('reports honestly when no composer is mounted', () => {
    expect(focusAgentComposer()).toBe(false)
  })

  it('declines a composer disabled for want of an API key', () => {
    // A caller must not claim the reader can keep typing into a field that
    // takes no typing.
    const field = mountComposer({ disabled: true })

    expect(focusAgentComposer()).toBe(false)
    expect(document.activeElement).not.toBe(field)
  })

  it('ignores a textarea that is not the composer', () => {
    mountComposer({ attributed: false })

    expect(focusAgentComposer()).toBe(false)
  })

  it('looks for the attribute the field module actually writes', () => {
    expect(
      sourceOf('components/editor/agent/ComposerInkedField.tsx'),
    ).toContain('data-agent-composer')
  })
})
