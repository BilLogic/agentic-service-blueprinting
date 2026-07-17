/** Split multi-value cell text (newline- or comma-separated) into display items. */
export function parseCellContentItems(content: string): string[] {
  return content
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
}
