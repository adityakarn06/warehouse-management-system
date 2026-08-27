import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Reading `window.innerWidth` in a `useState` initializer is a hydration
 * mismatch: the server renders `false`, a narrow client renders `true`, and
 * `SidebarProvider` swaps a `Sheet` in for the static sidebar on that branch —
 * a different subtree on the first pass, in the shell layout, on every route.
 *
 * `useSyncExternalStore` is the fix React provides for exactly this: the server
 * snapshot is authoritative for SSR *and* for the hydrating render, then React
 * re-renders with the client snapshot once hydration is committed. It also
 * keeps the subscription out of an effect, so there is no setState-in-effect
 * for the compiler lint to object to.
 */
function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** The server has no viewport; the desktop layout is the safe assumption. */
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
