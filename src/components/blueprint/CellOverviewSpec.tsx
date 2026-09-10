import type { ReactNode } from 'react'
import { useBlueprintCell } from '@/hooks/useBlueprintCell'
import { PANEL_TEXT } from '@/lib/panelText'
import { parseValueProps } from '@/lib/valueProps'

/**
 * One spec block: its label, and what is under it.
 *
 * `children` rather than only `text` because the value propositions are a
 * list and the other two are prose, and the LABEL is the part that has to be
 * identical — it is the word a reader takes to an engineer, so all three go
 * through one component rather than one of them hand-rolling its own heading.
 */
function SpecSection({
  title,
  text,
  children,
}: {
  title: string
  text?: string
  children?: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className={PANEL_TEXT.sectionLabel}>
        {title}
      </h3>
      {text !== undefined ? (
        <p className="text-sm whitespace-pre-wrap text-foreground/80">{text}</p>
      ) : null}
      {children}
    </section>
  )
}

type CellOverviewSpecProps = {
  /** Canonical (resolved) cell id; null when the cell is fallback-only. */
  cellId: string | null
}

/**
 * FUNCTION / FORM / VALUE PROPOSITION spec block in the panel's inline overview,
 * read-only. Sections render only when authored, from the board already in
 * memory; a cell with no spec renders nothing at all.
 *
 * Editing lives in `CellPanelEditor` — the panel's one form, one Save.
 */
export function CellOverviewSpec({ cellId }: CellOverviewSpecProps) {
  const spec = useBlueprintCell(cellId)

  if (!cellId) return null
  // No in-flight state to render around. The block used to hold ~250 ms for a
  // query of its own, so that it did not grow and then collapse on every cell
  // switch; the board carries the spec columns now, and this renders in the
  // same commit as the panel around it.
  const functionText = spec?.function?.trim() ?? ''
  const formText = spec?.form?.trim() ?? ''
  const valueProps = parseValueProps(spec?.value_props ?? null)
  const hasAnySpec =
    functionText.length > 0 || formText.length > 0 || valueProps.length > 0
  if (!hasAnySpec) return null

  return (
    <div className="flex flex-col gap-3 animate-in fade-in duration-(--motion-fade)">
      {functionText ? <SpecSection title="Function" text={functionText} /> : null}
      {formText ? <SpecSection title="Form" text={formText} /> : null}
      {valueProps.length > 0 ? (
        <SpecSection title="Value proposition">
          <ul className="flex flex-col gap-1">
            {valueProps.map((entry, index) => (
              <li key={index} className="text-sm leading-snug text-foreground/80">
                <span className="font-medium text-foreground">{entry.for}</span>
                {entry.for && entry.value ? ' — ' : ''}
                {entry.value}
              </li>
            ))}
          </ul>
        </SpecSection>
      ) : null}
    </div>
  )
}
