import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/**
 * The one trigger every select in a panel wears — `OwnerTagSelect` and
 * `OptionSelect` alike. Status sat between Owner and Perceived owner as a
 * native `<select>` (#256): the browser drew its own chevron, its own focus
 * ring and its own line box, so three controls in one column read as two
 * designs, and `h-7 w-fit text-xs` clipped "Live — in use today" along the
 * bottom and re-sized the row every time the value changed. One class, in
 * one place, is what makes "these match" a fact rather than a coincidence.
 *
 * Full width. A control whose width follows its value moves under the
 * pointer that just changed it; a control the width of its column does not.
 */
export const PANEL_SELECT_TRIGGER_CLASS =
  'flex h-8 w-full items-center justify-between gap-1 rounded-md border border-input bg-transparent px-2 text-left text-sm outline-none transition-colors hover:border-control-hover focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

export type SelectOption<V extends string> = {
  value: V
  label: string
}

/**
 * A fixed vocabulary, as a select.
 *
 * `StatusSelect` and `RoleSelect` were two copies of one native
 * `<select>`; this is the control they were both trying to be. Base UI's
 * `Select` keeps what the native element gave for free — keyboard, touch,
 * typeahead, a real listbox — and draws the trigger the way the panel's
 * other selects are drawn.
 *
 * The option text is the full label ("Live — in use today"), because the
 * dropdown is where a reader learns what the words mean; a badge only has
 * room for one of them. The trigger shows the same full label: at column
 * width it fits, and a reader should not have to open the list to learn what
 * the current value means either.
 */
export function OptionSelect<V extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: {
  value: V
  onChange: (next: V) => void
  options: ReadonlyArray<SelectOption<V>>
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next !== null && next !== value) onChange(next as V)
      }}
      // Labels by value, so the trigger can name its value before the list
      // has ever been opened (Base UI otherwise learns labels from mounted
      // items).
      items={options.map((option) => ({ value: option.value, label: option.label }))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(PANEL_SELECT_TRIGGER_CLASS, className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
