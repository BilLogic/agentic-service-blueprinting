/** Types for the direct-table-write scan (imported by the write-boundary contract). */
export declare const TABLE_WRITE: RegExp
/** The import that marks a file as declaring spec levels, and the table of one. */
export declare const DECLARES_SPEC_LEVELS: string
export declare const SPEC_LEVEL_TABLE: RegExp
/** The half of a sweep this scan uses: the files, and a read that may find one gone. */
export interface SweptFiles {
  files: string[]
  read(path: string, encoding?: BufferEncoding): string | null
}
export declare function appSources(repoRoot?: string): SweptFiles
export declare function directTableWrites(
  swept?: SweptFiles,
): { path: string; line: number; table: string; verb: string }[]
export declare function writtenTableNames(
  writes: { table: string }[],
): string[]
