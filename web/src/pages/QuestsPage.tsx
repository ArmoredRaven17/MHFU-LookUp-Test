import QuestBrowser from './QuestBrowser'
import { useRankTermStyle, formatRankTerm } from '../theme/rankTerms'

// Main (non-training) quest categories, in desktop dropdown order. Labels are the short canonical
// rank terms — rendered through formatRankTerm() so they follow the Settings > Rank Terminology choice.
const MAIN_CATEGORIES_BASE: [string, string][] = [
  ['village_low_rank_elder', 'Elder'],
  ['guild_low_rank', 'Low'],
  ['village_high_rank_nekoht', 'Nekoht'],
  ['guild_high_rank', 'High'],
  ['guild_g_rank', 'G Rank'],
]

export default function QuestsPage() {
  const style = useRankTermStyle()
  const categories = MAIN_CATEGORIES_BASE.map(([slug, term]) => [slug, formatRankTerm(term, style)] as [string, string])
  return <QuestBrowser routeBase="/quests" categoryOrder={categories} training={false} />
}
