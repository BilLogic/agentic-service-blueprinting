import { OptionSelect } from '@/components/blueprint/OptionSelect'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  type EntityStatus,
} from '@/lib/entityStatus'

const OPTIONS = ENTITY_STATUS.map((status) => ({
  value: status,
  label: ENTITY_STATUS_LABEL[status],
}))

/**
 * Status, as an editable field.
 *
 * It shipped read-only: a `StatusBadge` in both View and Edit mode, so the
 * one governed vocabulary on the board was the one thing an author could not
 * set from the panel. Six fixed options, no search, no multi-select — the
 * shape `OptionSelect` exists for (#256).
 */
export function StatusSelect({
  value,
  onChange,
  disabled,
  className,
  id,
}: {
  value: EntityStatus
  onChange: (next: EntityStatus) => void
  disabled?: boolean
  className?: string
  id?: string
}) {
  return (
    <OptionSelect
      value={value}
      onChange={onChange}
      options={OPTIONS}
      disabled={disabled}
      className={className}
      id={id}
    />
  )
}
