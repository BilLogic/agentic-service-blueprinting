/** Types for the direct-table-write scan (imported by the write-boundary contract). */
export declare const TABLE_WRITE: RegExp
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
