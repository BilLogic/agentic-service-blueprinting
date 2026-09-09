/** Types for the direct-table-write scan (imported by the write-boundary contract). */
export declare const SRC: string
export declare const TABLE_WRITE: RegExp
export declare function walkSources(directory: string, prefix?: string): string[]
export declare function directTableWrites(
  root?: string,
): { path: string; line: number; table: string; verb: string }[]
export declare function writtenTableNames(
  writes: { table: string }[],
): string[]
