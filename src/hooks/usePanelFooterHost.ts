import { useEffect, useState } from 'react'

/**
 * The panel footer's portal target, looked up once after the first commit.
 *
 * Four panels each carried this seven-line effect verbatim. The host is a
 * plain DOM node rendered by the shell, so it cannot exist during the render
 * that portals into it — hence the one-shot lookup rather than a ref.
 */
export function usePanelFooterHost(footerId: string): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot DOM lookup of the portal host; it only exists after the panel's first commit
    setHost(document.getElementById(footerId))
  }, [footerId])
  return host
}
