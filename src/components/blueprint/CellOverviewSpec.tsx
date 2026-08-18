import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCellSpec } from '@/hooks/useCellSpec'
import { parseValueProps } from '@/lib/valueProps'

function SpecSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-2xs font-medium text-muted-foreground">
        {title}
      </h3>
      <p className="text-sm whitespace-pre-wrap text-foreground/80">{text}</p>
    </section>
  )
}

type CellOverviewSpecProps = {
  /** Canonical (resolved) cell id; null when the cell is fallback-only. */
  cellId: string | null
}

/**
 * FUNCTION / FORM / VALUE spec block in the panel's inline overview,
 * read-only. Sections render only when authored; without a database (or for
 * fallback-only cells) the block stays hidden entirely.
 *
 * Editing lives in `CellPanelEditor` — the panel's one form, one Save.
 */
export function CellOverviewSpec({ cellId }: CellOverviewSpecProps) {
  const { client, configured } = useSupabase()
  const specResult = useCellSpec(configured ? cellId : null)

  if (!configured || !client || !cellId) return null
  // Nothing is rendered while the query is in flight — not even a reserved
  // placeholder. Most cells have no spec at all, so reserving space meant the
  // block (and everything below it, including the tab row) grew for ~250 ms
  // and then collapsed again on *every* cell switch.
  if (specResult.status !== 'ready') return null

  const spec = specResult.data
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
        <section className="flex flex-col gap-1">
          <h3 className="text-2xs font-medium text-muted-foreground">
            Value
          </h3>
          <ul className="flex flex-col gap-1">
            {valueProps.map((entry, index) => (
              <li key={index} className="text-sm leading-snug text-foreground/80">
                <span className="font-medium text-foreground">{entry.for}</span>
                {entry.for && entry.value ? ' — ' : ''}
                {entry.value}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
