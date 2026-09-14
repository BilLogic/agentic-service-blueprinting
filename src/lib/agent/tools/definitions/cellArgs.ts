import { z } from 'zod'
import { arg } from '@/lib/agent/tools/definition'
import { CELL_FIELDS, type AnyCellField, type CellFieldGroup } from '@/lib/cellFields'

/**
 * The cell-writing tools' arguments, from the cell field list.
 *
 * A tool advertised one spelling and read another once — that class of bug
 * is what the descriptors' `agentArg` closes: the argument name IS the
 * column key, typed so, and the schema a tool offers the model is built
 * from the same descriptors the panel renders its fields from. Add a
 * descriptor with an `agentArg` and the tool gains the argument; the panel
 * gains the field in the same edit.
 */

/** The descriptors the agent may set: those carrying an argument name. */
export type AgentCellField = AnyCellField & { agentArg: string }

export const agentCellFields = (
  fields: readonly AnyCellField[] = CELL_FIELDS,
): AgentCellField[] =>
  fields.filter((descriptor): descriptor is AgentCellField => descriptor.agentArg !== undefined)

/**
 * What the model reads for the argument: the descriptor's own sentence for
 * it where it has one, else the hint a person reads above the control.
 */
const agentSentence = (descriptor: AgentCellField) =>
  descriptor.agentHint ?? descriptor.hint.replace(/\.$/, '')

/** The zod schema for one field's argument, required or optional. */
function fieldArg(descriptor: AgentCellField, required: boolean): z.ZodTypeAny {
  const sentence = required ? agentSentence(descriptor) : `${agentSentence(descriptor)}; omit to keep`
  if (descriptor.key === 'value_props') {
    const list = z
      .array(
        z.object({
          for: z.string().describe('Audience'),
          value: z.string().describe('The value delivered'),
        }),
      )
      .describe(sentence)
    return required ? list : list.optional()
  }
  return required ? arg.text(sentence) : arg.optionalText(sentence)
}

/**
 * The argument shape for a set of cell fields, keyed by argument name.
 * Takes the list so a test can hand it one more descriptor and watch the
 * shape gain the argument.
 */
export function cellFieldArgs(
  fields: readonly AnyCellField[],
  { required }: { required: boolean },
): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(
    agentCellFields(fields).map((descriptor) => [descriptor.agentArg, fieldArg(descriptor, required)]),
  )
}

/** The agent-settable fields of one group, in the list's order. */
export const agentCellFieldsOf = (group: CellFieldGroup, fields: readonly AnyCellField[] = CELL_FIELDS) =>
  agentCellFields(fields).filter((descriptor) => descriptor.group === group)

/**
 * The fields of one group as a sentence for a tool description — each
 * argument name with the panel's own hint, so the words the model reads
 * about a field are the words a person reads above it.
 */
export function describeCellFields(group: CellFieldGroup, fields: readonly AnyCellField[] = CELL_FIELDS): string {
  return agentCellFieldsOf(group, fields)
    .map((descriptor) => `${descriptor.agentArg} (${descriptor.hint.replace(/\.$/, '')})`)
    .join(', ')
}
