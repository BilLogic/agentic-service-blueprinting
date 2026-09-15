import { describe, expect, it } from 'vitest'
import { bytesOf, sourcePathsOn } from '@/lib/sourceTree'

/**
 * Every source file ends with a newline.
 *
 * A small thing with one sharp consequence here: this tree is consumed as
 * source, and a deployment holds shared files byte-identical to their copy in
 * this repository. A file whose last line has no terminator differs from the
 * same file written by any editor that adds one, so the difference is real
 * and unfixable on the consuming side — it can only be reconciled here. That
 * is a whole enrolment blocked by one absent byte.
 *
 * It also makes every future diff of that file start by rewriting its last
 * line, which buries the change that was actually made.
 */
describe('the source tree', () => {
  it('ends every file with a newline', () => {
    const offenders = sourcePathsOn().filter((file) => {
        const bytes = bytesOf(file)
        return bytes.length > 0 && bytes.at(-1) !== 0x0a
      })
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
