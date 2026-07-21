import { useCallback, useEffect, useState } from 'react'

// Tracks which weapons the user has made/upgraded — a personal progress checklist for the weapon
// tree. Web-only addition (no desktop equivalent). Mirrors useBookmarks.ts's localStorage +
// custom-event shape.
const KEY = 'mhfu-made-weapons'
const EVENT = 'mhfu-made-weapons-changed'

function read(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')) } catch { return new Set() }
}

function write(ids: Set<string>) {
  localStorage.setItem(KEY, JSON.stringify([...ids]))
}

export function useMadeWeapons() {
  const [made, setMade] = useState<Set<string>>(read)

  useEffect(() => {
    const handler = () => setMade(read())
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const toggle = useCallback((id: string) => {
    const next = read()
    next.has(id) ? next.delete(id) : next.add(id)
    write(next)
    setMade(next)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const isMade = useCallback((id: string) => made.has(id), [made])

  return { made, toggle, isMade }
}
