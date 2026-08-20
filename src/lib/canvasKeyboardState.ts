let spaceHeld = false

export function setCanvasSpaceHeld(next: boolean): void {
  spaceHeld = next
}

export function getCanvasSpaceHeld(): boolean {
  return spaceHeld
}
