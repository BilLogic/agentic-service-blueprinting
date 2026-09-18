import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { VIEW_SCREENSHOT_DIR } from './playwright.config'

/**
 * The phone's agent jump, in a real browser at 375×812.
 *
 * ── WHY THIS EXISTS BESIDE THE JSDOM SLICE ─────────────────────────────────
 *
 * `src/slices/phoneAgentJump.slice.test.tsx` runs the same flow end to end
 * over the real shell, sheet, bridge and navigation tools, and it is the
 * faster guard by two orders of magnitude. But it runs in jsdom, which lays
 * nothing out and schedules no frames, so it turns the clock by hand and
 * stands a dozen lines in for the viewport. Three of its claims are therefore
 * not its to make, and they are the ones a reader would notice first:
 *
 *   1. **The wall clock.** The slice advances fake timers, so the tool's
 *      1800 ms verification deadline and the caret watcher's 2000 ms one are
 *      never actually raced. Here they are: the fade, the remount, the fit
 *      and the poll all take the time they take, and the sentence the tool
 *      answers with — settled, or "not verified before timeout" — is the
 *      deadline, measured.
 *   2. **The strip above the sheet is legible.** The slice asserts a NUMBER
 *      reached the camera. Whether the wash over that strip is thin enough to
 *      read the canvas through is a fact about a compositor, and this case
 *      asserts the overlay's weight and files the screenshot a person reads.
 *   3. **The destination is visibly inside it.** The slice asserts an inset;
 *      here the destination artboard has a box, the sheet has a box, and the
 *      first is above the second.
 *
 * ── HOW THE AGENT IS DRIVEN WITHOUT A MODEL ────────────────────────────────
 *
 * The provider endpoint is intercepted and answered with a canned round: one
 * `tool_use` for `open_scenario` naming a scenario read off this board, then
 * one text turn. Everything after the response body is the shipped code —
 * the loop, the tool registry, `open_scenario`, the bridge, the shell, the
 * viewport — which is the whole point: what is faked is the model, not the
 * app. The key is a string in this file's own `localStorage` seed and reaches
 * no network, because no request leaves the page.
 *
 * ── WHAT IT BORROWS FROM THE APP ───────────────────────────────────────────
 *
 * `data-cover-page`, `data-nav-row`, `data-focus-slide-id`, the
 * `sheet-content` / `sheet-overlay` slots, the `Messages` region, and the
 * `Open navigation` / `Close` / `Ask the agent` / `New session` / `Send`
 * accessible names. They are listed in `render-walk/README.md` § What the
 * walk reads off the app.
 *
 * The storage prefix is this template's own (`sb-`), and a deployment that
 * renamed its namespace passes `RENDER_WALK_STORAGE_PREFIX`: the seed below
 * is the one thing in this directory that has to know an installation's
 * prefix, because nothing on the page publishes it.
 *
 * The console-error rule of the walk applies here as well: any `console.error`
 * or page error during the flow fails this test, and
 * `RENDER_WALK_INJECT_CONSOLE_ERROR` makes it fail on purpose.
 */

/**
 * The browser globals the two page-side callbacks below touch.
 *
 * `render-walk/` is typechecked in this repository's NODE program — these
 * files are Node programs that DRIVE a browser — so the DOM lib is out of
 * scope here even though the bodies handed to `addInitScript` and `evaluate`
 * are evaluated in the page. Declaring exactly what those bodies use keeps
 * the config honest for every other file in that program, and keeps the
 * surface this spec assumes of the page written down.
 */
declare const window: {
  localStorage: { setItem(key: string, value: string): void }
}
declare function getComputedStyle(node: unknown): {
  backdropFilter: string
  webkitBackdropFilter: string
  backgroundColor: string
  opacity: string
}

const MOBILE_SCREENSHOT_DIR = join(VIEW_SCREENSHOT_DIR, 'mobile')

/** The namespace this installation's keys live under — see the header. */
const STORAGE_PREFIX = process.env.RENDER_WALK_STORAGE_PREFIX ?? 'sb-'

/** What a landed scenario jump answers with, from `lib/agent/uiBridge.ts`. */
const CAMERA_SETTLED = 'Opened the scenario and settled its canvas camera.'

/**
 * Answer the provider with one tool call and then one sentence.
 *
 * Stateful by design: the loop sends again with the tool's result, and a
 * handler that replied `tool_use` twice would loop until the round cap.
 */
async function scriptTheModel(page: Page, scenarioId: string) {
  let rounds = 0
  await page.route('https://api.anthropic.com/**', async (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors })
      return
    }
    rounds += 1
    const body =
      rounds === 1
        ? {
            content: [
              {
                type: 'tool_use',
                id: 'call-1',
                name: 'open_scenario',
                input: { scenario_id: scenarioId },
              },
            ],
            stop_reason: 'tool_use',
          }
        : {
            content: [{ type: 'text', text: 'Taken you there.' }],
            stop_reason: 'end_turn',
          }
    await route.fulfill({
      status: 200,
      headers: { ...cors, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  })
}

/**
 * The alpha of a computed colour, whichever notation the engine answers in.
 *
 * Chromium returns the modern space the theme is authored in
 * (`oklab(L a b / 0.4)`) and the legacy one (`rgba(r, g, b, 0.4)`) depending
 * on the declaration, and a reader of one form only would score a translucent
 * wash as opaque and pass an assertion meant to catch exactly that.
 */
function alphaOf(colour: string): number {
  const slashed = /\/\s*([\d.]+)%?\s*\)/.exec(colour)
  if (slashed) return Number(slashed[1]) / (colour.includes('%)') ? 100 : 1)
  const legacy = /rgba?\([^)]*?,\s*([\d.]+)\s*\)$/.exec(colour)
  return legacy ? Number(legacy[1]) : 1
}

test.describe('the phone agent jump', () => {
  test('moves the camera with the sheet up, above it, inside the deadline', async ({
    page,
  }) => {
    mkdirSync(MOBILE_SCREENSHOT_DIR, { recursive: true })

    const prefix = STORAGE_PREFIX
    await page.addInitScript(
      ([keyPrefix]) => {
        window.localStorage.setItem(
          `${keyPrefix}agent-settings`,
          JSON.stringify({
            provider: 'anthropic',
            models: {},
            keys: { anthropic: 'render-walk-key' },
          }),
        )
      },
      [prefix],
    )

    if (process.env.RENDER_WALK_INJECT_CONSOLE_ERROR) {
      await page.addInitScript(() => {
        console.error('render-walk self-test: injected')
      })
    }

    const problems: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error')
        problems.push(`console.error: ${message.text()}`)
    })
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
    /** Fail the flow if any console or page error was recorded. */
    const assertNoProblems = (where: string) =>
      expect(problems, `${where}: ${problems.join('\n')}`).toEqual([])

    await page.goto('/')
    const cover = page.locator('[data-cover-page]')
    await expect(cover).toBeVisible()
    await cover.locator('header button').first().click()
    await expect(page.locator('[data-cover-page]')).toHaveCount(0)

    const landing = page.locator('[data-focus-slide-id]').first()
    await expect(landing).toBeVisible()
    const landingId = await landing.getAttribute('data-focus-slide-id')
    assertNoProblems('on the CTA landing')

    // The destination, read off the drawer rather than out of
    // `sampleBlueprint.ts`: this walk runs against a deployment's OWN sample
    // board. The LAST phase's first scenario, so the jump is a real move off
    // the phase the CTA landed on.
    await page.getByRole('button', { name: 'Open navigation' }).click()
    const phaseToggles = page.locator('[data-nav-row] button[aria-expanded]')
    await expect(phaseToggles.first()).toBeVisible()
    const lastPhase = phaseToggles.last()
    if ((await lastPhase.getAttribute('aria-expanded')) === 'false') {
      await lastPhase.click()
      await expect(lastPhase).toHaveAttribute('aria-expanded', 'true')
    }
    const destination = await lastPhase
      .locator('xpath=ancestor::*[@data-nav-row][1]')
      .locator('xpath=following-sibling::*//*[@data-nav-row]')
      .first()
      .getAttribute('data-nav-row')
    expect(destination, 'the last phase offers a scenario').toBeTruthy()
    expect(
      destination,
      'the destination is not the scenario already on screen',
    ).not.toBe(landingId)
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('[data-slot="sheet-content"]')).toHaveCount(0)

    await scriptTheModel(page, destination as string)

    // The reader opens the ✦ sheet and asks for the move.
    await page.getByRole('button', { name: 'Ask the agent' }).click()
    const sheet = page.locator('[data-slot="sheet-content"]')
    await expect(sheet).toBeVisible()
    await page.getByRole('button', { name: 'New session' }).click()
    const composer = page.locator('textarea[data-agent-composer]')
    await expect(composer).toBeEnabled()
    await composer.fill('Take me to the last phase.')
    const askedAt = Date.now()
    await page.getByRole('button', { name: 'Send' }).click()

    // THE TOOL'S OWN ANSWER IS THE DEADLINE, MEASURED. `open_scenario` waits
    // on the selection and on the camera's published verdict for at most
    // 1800 ms and says which it got; the row below carries that sentence, so
    // a fit that landed too late for a real device reads as a timeout here
    // rather than as a pass.
    const messages = page.getByRole('region', { name: 'Messages' })
    const toolRow = messages
      .getByText('open_scenario', { exact: true })
      .locator('xpath=ancestor::button[1]')
    await expect(toolRow).toBeVisible({ timeout: 30_000 })
    await toolRow.click()
    await expect(
      messages.getByText(CAMERA_SETTLED, { exact: false }),
    ).toBeVisible()
    const settledIn = Date.now() - askedAt

    // THE SHEET STAYED, with the conversation in it.
    await expect(sheet).toBeVisible()
    await expect(composer).toBeVisible()

    // THE DESTINATION IS ON SCREEN, IN THE STRIP THE SHEET LEAVES. The fit
    // inset the slice asserts as a number is this, in pixels a person could
    // point at: the board the agent was asked for overlaps the visible strip,
    // and cells of it with words in them are wholly inside it. A shell that
    // threw the inset away aims the board at the middle of a screen whose
    // bottom 60% is covered, and the strip comes up empty here.
    const board = page.locator(`[data-focus-slide-id="${destination}"]`)
    await expect(board).toBeVisible()
    const boardBox = await board.boundingBox()
    const sheetBox = await sheet.boundingBox()
    expect(boardBox, 'the destination artboard has a box').toBeTruthy()
    expect(sheetBox, 'the sheet has a box').toBeTruthy()
    expect(
      boardBox!.y,
      'the destination reaches into the strip above the sheet',
    ).toBeLessThan(sheetBox!.y)
    expect(
      Math.min(boardBox!.y + boardBox!.height, sheetBox!.y) -
        Math.max(boardBox!.y, 0),
      'and it is a strip-full of board, not a sliver of its edge',
    ).toBeGreaterThan(sheetBox!.y / 3)
    // Read cell by cell through locators rather than in one page-side pass:
    // this file is typechecked as a Node program, and a body full of DOM
    // globals would have to be declared here for no gain.
    const viewport = page.viewportSize()
    expect(viewport, 'the phone project sets a viewport').toBeTruthy()
    const cells = board.locator('[data-blueprint-cell]')
    let readable = 0
    for (let index = 0; index < (await cells.count()); index += 1) {
      const cell = cells.nth(index)
      const box = await cell.boundingBox()
      if (!box) continue
      const words = (await cell.innerText()).trim()
      if (
        words.length > 0 &&
        box.y >= 0 &&
        box.y + box.height <= sheetBox!.y &&
        box.x < viewport!.width &&
        box.x + box.width > 0
      )
        readable += 1
    }
    expect(
      readable,
      'cells of the destination are legible above the sheet',
    ).toBeGreaterThan(0)

    // THE STRIP IS LEGIBLE THROUGH THE WASH. Not a judgement — two facts the
    // browser can answer: nothing is blurred behind the overlay, and the wash
    // is a minority of the colour over the canvas. The screenshot below is
    // the half a person reads.
    const overlay = page.locator('[data-slot="sheet-overlay"]')
    await expect(overlay).toBeVisible()
    const wash = await overlay.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
        background: style.backgroundColor,
        opacity: style.opacity,
      }
    })
    expect(wash.backdropFilter, 'no blur over the strip').toMatch(/^(none|)$/)
    expect(
      alphaOf(wash.background) * Number(wash.opacity),
      'the wash over the strip is a minority of the colour',
    ).toBeLessThan(0.6)

    await page.screenshot({
      path: join(MOBILE_SCREENSHOT_DIR, 'agent-jump.png'),
    })
    assertNoProblems('after the agent jump')

    console.log(
      `render-walk: phone agent jump to ${destination} settled in ${settledIn} ms; ` +
        `screenshot in ${join(MOBILE_SCREENSHOT_DIR, 'agent-jump.png')}`,
    )
  })
})
