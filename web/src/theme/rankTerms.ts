// Toggle between MHFU's short "flavor" rank-tier names (Elder/Nekoht — the two Village quest-giver
// NPCs — plus Low/High/G Rank as used in monster reward tables) and their fuller "Low/High Rank
// Village/Guild" names (already shown on the Quests tab's category tabs). One shared setting
// applied everywhere these 5 tiers are displayed. Mirrors theme/textScale.ts's localStorage +
// custom-event + useSyncExternalStore pattern. Web-only addition — no desktop equivalent.
import { useSyncExternalStore } from 'react'

export type RankTermStyle = 'short' | 'long'

// [short form, long form]. "G" is the bare form used in the Monster page's Quest Stats table;
// "G Rank" is the form used in reward-tier tables and the Quests tab — both mean G Rank Guild.
const SHORT_TO_LONG = new Map<string, string>([
  ['Elder', 'Low Rank Village'],
  ['Nekoht', 'High Rank Village'],
  ['Low', 'Low Rank Guild'],
  ['High', 'High Rank Guild'],
  ['G', 'G Rank Guild'],
  ['G Rank', 'G Rank Guild'],
])

export const RANK_TERM_STYLES: { value: RankTermStyle; label: string }[] = [
  { value: 'short', label: 'Elder / Nekoht / Low / High / G Rank' },
  { value: 'long', label: 'Low Rank Village / High Rank Village / Low Rank Guild / High Rank Guild / G Rank Guild' },
]

export const DEFAULT_RANK_TERM_STYLE: RankTermStyle = 'short'
const LS_KEY = 'mhfu-rank-term-style'
const EVENT = 'mhfu-rank-term-style-changed'

export const getRankTermStyle = (): RankTermStyle =>
  (localStorage.getItem(LS_KEY) as RankTermStyle | null) ?? DEFAULT_RANK_TERM_STYLE

export function setRankTermStyle(style: RankTermStyle) {
  localStorage.setItem(LS_KEY, style)
  window.dispatchEvent(new Event(EVENT))
}

export function resetRankTermStyle() { setRankTermStyle(DEFAULT_RANK_TERM_STYLE) }

/**
 * Render short-form rank term(s) in whichever style is currently selected. Handles both a single
 * term ("G Rank") and a "/"-joined combo ("Elder/Low"); unrecognised segments pass through
 * unchanged (e.g. "Guild 1★~2★", "Special", "Treasure Hunt", "Challenge").
 */
export function formatRankTerm(text: string, style: RankTermStyle = getRankTermStyle()): string {
  if (style === 'short') return text
  return text.split('/').map(seg => SHORT_TO_LONG.get(seg) ?? seg).join('/')
}

export function useRankTermStyle(): RankTermStyle {
  return useSyncExternalStore(
    cb => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('storage', cb)
      return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb) }
    },
    getRankTermStyle,
    () => DEFAULT_RANK_TERM_STYLE,
  )
}
