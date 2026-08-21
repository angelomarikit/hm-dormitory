import { useRef, type ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

export function KeepAliveOutlet() {
  const outlet = useOutlet()
  const { pathname } = useLocation()
  const cache = useRef(new Map<string, ReactNode>())

  if (outlet) {
    cache.current.set(pathname, outlet)
  }

  return (
    <>
      {Array.from(cache.current.entries()).map(([path, element]) => {
        const active = path === pathname
        return (
          <div key={path} hidden={!active} inert={!active || undefined}>
            {element}
          </div>
        )
      })}
    </>
  )
}
