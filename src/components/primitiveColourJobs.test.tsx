// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { InputGroup } from '@/components/ui/input-group'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select'

/*
 * WHICH COLOUR JOB each shared primitive applies — the class, not the hex.
 *
 * The hex is the wrong assertion here and would be worse than none. The mix
 * dials in this system already match the design system these primitives were
 * ported from, so a contrast or colour-value check passes both before and
 * after the bug: an empty field whose placeholder sat on CAPTION grey resolved
 * to a perfectly good colour, it was simply the colour of text somebody had
 * typed. What was wrong was the job. So each assertion below names the job.
 *
 * Deliberately not a snapshot of the whole class string. These files carry
 * geometry, timings, focus and invalid states that change for their own
 * reasons; pinning all of it would fail on every unrelated edit and teach the
 * next person to re-record rather than read. Only the tokens that encode a
 * decision are pinned, plus the raw values that decision replaced.
 */

afterEach(cleanup)

/**
 * An UNPREFIXED utility — the resting state. `file:bg-transparent` and
 * `disabled:bg-transparent` are variants on other states and are none of this
 * test's business; a bare `bg-transparent` is the plate the control sits on.
 */
function hasResting(classes: string, utility: string): boolean {
  return classes.split(/\s+/).includes(utility)
}

function classesOf(slot: string, ui: React.ReactElement): string {
  const { container } = render(ui)
  const node = container.querySelector(`[data-slot="${slot}"]`)
  if (!node) throw new Error(`no [data-slot="${slot}"] rendered`)
  return node.className
}

describe('an empty field looks empty', () => {
  it('gives Input a hint-grey placeholder, never caption grey', () => {
    const classes = classesOf('input', <Input placeholder="Add a note" />)
    expect(classes).toContain('placeholder:text-tertiary-foreground')
    expect(classes).not.toContain('placeholder:text-muted-foreground')
  })

  it('gives Textarea the same hint grey', () => {
    const classes = classesOf('textarea', <Textarea placeholder="Add a note" />)
    expect(classes).toContain('placeholder:text-tertiary-foreground')
    expect(classes).not.toContain('placeholder:text-muted-foreground')
  })

  it('sits Input and Textarea on the sunk field plate', () => {
    // `bg-transparent` is the resting fill this replaced: a field that borrows
    // the page colour reads as a label rather than a place to type.
    const input = classesOf('input', <Input />)
    expect(hasResting(input, 'bg-field')).toBe(true)
    expect(hasResting(input, 'bg-transparent')).toBe(false)
    expect(input).not.toContain('dark:bg-input/30')
    const textarea = classesOf('textarea', <Textarea />)
    expect(hasResting(textarea, 'bg-field')).toBe(true)
    expect(hasResting(textarea, 'bg-transparent')).toBe(false)
    expect(textarea).not.toContain('dark:bg-input/30')
  })

  it('sits a grouped input on that same plate, so the group is one control', () => {
    const classes = classesOf('input-group', <InputGroup />)
    expect(classes).toContain('bg-field')
    expect(classes).not.toContain('dark:bg-input/30')
  })
})

describe('a locked value looks like a caption', () => {
  it('reads a read-only Input as caption ink on the ordinary border', () => {
    const classes = classesOf('input', <Input readOnly value="Live" />)
    expect(classes).toContain('read-only:text-muted-foreground')
    expect(classes).toContain('read-only:border-border')
  })

  it('still fades the whole control when disabled', () => {
    // Not upstream's Input-only "disabled ink is tertiary": their own textarea
    // fades the plate, and two controls must not disagree about disabled.
    expect(classesOf('input', <Input disabled />)).toContain('disabled:opacity-50')
  })
})

describe('a chooser looks raised', () => {
  it('sits the select trigger on the raised control plate, with a hover edge', () => {
    const classes = classesOf(
      'select-trigger',
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    )
    expect(hasResting(classes, 'bg-control-raised')).toBe(true)
    expect(hasResting(classes, 'bg-transparent')).toBe(false)
    expect(classes).not.toContain('dark:bg-input/30')
    expect(classes).toContain('hover:border-control-hover')
  })

  it('gives an unchosen select the same hint grey as an empty field', () => {
    const classes = classesOf(
      'select-trigger',
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
      </Select>,
    )
    expect(classes).toContain('data-placeholder:text-tertiary-foreground')
    expect(classes).not.toContain('data-placeholder:text-muted-foreground')
  })
})

describe('a switch uses named colours', () => {
  it('washes the off track with a control colour, not raw black or white', () => {
    // Raw black and white are a hole punched through the page: they ignore the
    // theme's own surface ramp and move independently of everything near them.
    const classes = classesOf('switch', <Switch />)
    expect(classes).toContain('bg-control-raised')
    expect(classes).not.toContain('bg-black/')
    expect(classes).not.toContain('dark:bg-white/')
  })

  it('keeps the filled-control colour when on', () => {
    expect(classesOf('switch', <Switch />)).toContain('data-checked:bg-primary')
  })

  it('gives the thumb a named hairline', () => {
    const classes = classesOf('switch-thumb', <Switch />)
    expect(classes).toContain('ring-border')
    expect(classes).not.toContain('ring-black/')
  })
})
