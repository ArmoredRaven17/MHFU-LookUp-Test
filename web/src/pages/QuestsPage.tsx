import QuestBrowser from './QuestBrowser'

// Main (non-training) quest categories, in desktop dropdown order + friendly labels.
const MAIN_CATEGORIES: [string, string][] = [
  ['village_low_rank_elder', 'Low Rank Village'],
  ['guild_low_rank', 'Low Rank Guild'],
  ['village_high_rank_nekoht', 'High Rank Village'],
  ['guild_high_rank', 'High Rank Guild'],
  ['guild_g_rank', 'G Rank'],
]

export default function QuestsPage() {
  return <QuestBrowser routeBase="/quests" categoryOrder={MAIN_CATEGORIES} training={false} />
}
