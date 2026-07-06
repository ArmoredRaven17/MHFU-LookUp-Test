import QuestBrowser from './QuestBrowser'

// The six Training School categories, in desktop dropdown order + friendly labels.
const TRAINING_CATEGORIES: [string, string][] = [
  ['training_basic', 'Basic Training'],
  ['training_weapon_mastery', 'Weapon Mastery'],
  ['training_battle', 'Battle Training'],
  ['training_special', 'Special Training'],
  ['training_g_lv', 'G Lv Training'],
  ['training_group', 'Group Training'],
]

export default function TrainingSchoolPage() {
  return <QuestBrowser routeBase="/training" categoryOrder={TRAINING_CATEGORIES} training />
}
