import { useCallback, useEffect, useState } from 'react'

export interface Bookmark {
  type: string   // 'monster' | 'weapon' | 'item' | etc. (matches desktop Bookmarks keys)
  id: string
  name: string
  path: string   // full route path e.g. '/monsters/rathalos'
  icon?: string  // full asset url resolved at bookmark time (falls back to the tab icon)
}

const KEY = 'mhfu-bookmarks'

function read(): Bookmark[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function write(bm: Bookmark[]) {
  localStorage.setItem(KEY, JSON.stringify(bm))
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(read)

  useEffect(() => {
    const handler = () => setBookmarks(read())
    window.addEventListener('mhfu-bookmarks', handler)
    return () => window.removeEventListener('mhfu-bookmarks', handler)
  }, [])

  const dispatch = useCallback((next: Bookmark[]) => {
    write(next)
    setBookmarks(next)
    window.dispatchEvent(new Event('mhfu-bookmarks'))
  }, [])

  const add = useCallback((bm: Bookmark) => {
    dispatch([...read().filter(b => b.path !== bm.path), bm])
  }, [dispatch])

  const remove = useCallback((path: string) => {
    dispatch(read().filter(b => b.path !== path))
  }, [dispatch])

  const isBookmarked = useCallback((path: string) => {
    return bookmarks.some(b => b.path === path)
  }, [bookmarks])

  return { bookmarks, add, remove, isBookmarked }
}
