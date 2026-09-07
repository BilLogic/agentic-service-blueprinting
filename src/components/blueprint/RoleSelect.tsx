import { OptionSelect } from '@/components/blueprint/OptionSelect'
import {
  TOUCHPOINT_ROLE_OPTIONS,
  type TouchpointRoleValue,
} from '@/lib/touchpointRole'

/** The sentinel the select uses for "no value" — `null` is not a string. */
const UNMARKED = ''

type Marked = Exclude<TouchpointRoleValue, null>

const OPTIONS = TOUCHPOINT_ROLE_OPTIONS.map((option) => ({
  value: option.value ?? UNMARKED,
  label: option.label,
}))

/**
 * Core, peripheral, or left alone.
 *
 * The same control as `StatusSelect` over a three-word vocabulary.
 *
 * The unmarked option is FIRST and is a real choice rather than a placeholder.
 * A select whose empty state is an unselectable prompt teaches that
 * something is missing; here nothing is missing — most placements will never
 * be judged, and the author has to be able to go back to that state after
 * marking one by mistake. Its label says "nobody has judged this" so that
 * choosing it is not choosing a third degree of importance.
 */
export function RoleSelect({
  value,
  onChange,
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}: {
  value: TouchpointRoleValue
  onChange: (next: TouchpointRoleValue) => void
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}) {
  return (
    <OptionSelect
      value={value ?? UNMARKED}
      onChange={(next) => onChange(next === UNMARKED ? null : (next as Marked))}
      options={OPTIONS}
      disabled={disabled}
      className={className}
      id={id}
      aria-label={ariaLabel}
    />
  )
}
