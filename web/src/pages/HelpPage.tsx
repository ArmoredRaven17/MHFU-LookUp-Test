import { useState } from 'react'
import type { ReactNode } from 'react'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'

const B = ({ children }: { children: ReactNode }) => <span style={{ fontWeight: 600 }}>{children}</span>
const Pos = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--positive)' }}>{children}</span>
const Neg = ({ children }: { children: ReactNode }) => <span style={{ color: 'var(--negative)' }}>{children}</span>

interface TabHelp { title: string; bullets: ReactNode[] }

const TABS: TabHelp[] = [
  { title: 'Bookmarks', bullets: [
    'Your saved monsters, weapons, items, armor sets, armor skills, decorations, quests, treasures, gathering areas and Trenya destinations, grouped by type.',
    <>Add a bookmark with the <B>bookmark icon</B> next to the name on any of those detail views; click it again to remove.</>,
    <>Click an entry here to jump straight to it, or use the <B>✕</B> to remove it.</>,
  ] },
  { title: 'Notes', bullets: [
    "Every note you've added to a monster, weapon, armor set or quest, grouped by type.",
    <>Edit a note right here (it saves when you click away), click the name to open its page, or remove it with <B>✕</B>.</>,
    <><B>Export Notes</B> — save all your weapon &amp; monster notes to a text document.</>,
  ] },
  { title: 'Monsters', bullets: [
    "The monster's name and icon stay pinned at the top while you scroll the details.",
    'Hitzones for cut / impact / shot and each element, colour-coded by how much damage the part takes.',
    'Stagger and break thresholds.',
    'Ailment tolerances (poison, paralysis, sleep, and so on).',
    'Carve / capture / break reward tables, listed per rank.',
    <><B>Monster Facts</B> — trivia and reference notes about the monster.</>,
    <><B>Notes</B> — your own editable notes for each monster; they save automatically.</>,
  ] },
  { title: 'Weapons', bullets: [
    'Upgrade trees for every weapon type, drawn with full branch lines and collapsible nodes (click the arrow to fold a branch).',
    'Weapon names are colour-coded by their element / status — a gradient for dual-element weapons — or orange when the weapon has a defense bonus instead.',
    'Cross-type forges are linked both ways: a weapon that forges into another type shows as an italic link in its tree, and appears under a "forged from" origin at the top of the target tree. Click either to jump across.',
    'Each weapon shows a rarity-coloured weapon-type icon, in both the upgrade tree and the detail header.',
    'Per-weapon stats: rarity (colour-coded by tier), sharpness, element / status (with icons), slots and affinity.',
    <>Attack shows the displayed value with <B>True Raw</B> in parentheses — e.g. "912 (190)". True Raw is the displayed Attack divided by the weapon's class multiplier (Great Sword/Long Sword 4.8, Hammer/Hunting Horn 5.2, Lance/Gunlance 2.3, Sword &amp; Shield/Dual Blades 1.4, bowguns &amp; Bow 1.2), so you can compare real power across weapon types.</>,
    <>Element and status values likewise show their <B>True Value</B> (displayed ÷ 10) in parentheses — e.g. "470 (47)".</>,
    'Crafting materials shown with icons (each can link back to the monster or item it comes from), plus the create / upgrade recipes.',
    'Type-specific detail: bow charges & coatings, bowgun ammo loadouts, gunlance shelling, hunting-horn notes & songs. Each adds a reference button — Hunting Horn "Songs…", the bowguns "Ammo…", Bow "Shot Types…", and Gunlance "Shells…".',
    'MHP2G-exclusive "(DUMMY)" weapons are included and labelled — they can\'t normally be crafted in MHFU.',
    <><B>Notes</B> — your own editable notes for each weapon; they save automatically.</>,
  ] },
  { title: 'Armor Sets', bullets: [
    'Search by set name, a skill you want points in (e.g. "Sneak"), or an activated skill (e.g. "Stealth").',
    'Per-piece defense, resistances, slots and skill points.',
    <>Skills that activate when the set is worn (<Pos>Green</Pos> = Positive Skills, <Neg>Red</Neg> = Negative Skills).</>,
    'Blademaster / Gunner toggle to switch the variant.',
    'Male / Female toggle for set and piece names.',
    <><B>Notes</B> — your own editable notes for each set; they save automatically.</>,
  ] },
  { title: 'Armor Skills', bullets: [
    'All skills listed alphabetically by default; use the dropdown to filter to a category (Offense, Defense, Bowgun, …). A skill can appear in more than one category.',
    'Point thresholds and what each tier does, and which categories the skill belongs to.',
    <>The categories mirror the skill groupings in <B>Athena's Armor Set Search</B> for MHFU — so if you plan sets with that tool, finding the relevant skills here should feel familiar.</>,
  ] },
  { title: 'Decorations', bullets: [
    'Jewels and the skills (with points) they grant.',
    'Slot cost for each jewel.',
    'Recipes to craft them.',
    'List by name or by skill.',
  ] },
  { title: 'Quests', bullets: [
    'Organized by hub and rank.',
    'Target monster(s) and/or delivery-item icons.',
    'KEY / URGENT badges.',
    'Objective, fee, reward and unlock conditions.',
    <><B>Notes</B> — your own editable notes for each quest; they save automatically.</>,
  ] },
  { title: 'Training School', bullets: [
    'The Training School quests, selectable by category.',
    'Per quest: danger rating, objective and item sets.',
    <>Weapon Selection — each loaner weapon &amp; armor loadout with its instructor notes and active skills (<Pos>Green</Pos> = Positive Skills, <Neg>Red</Neg> = Negative Skills).</>,
  ] },
  { title: 'Gathering', bullets: [
    'Per-area node tables.',
    'Zone, node and type stay fixed on the left while you scroll.',
    'Low / High / G-rank, Training and Treasure columns.',
  ] },
  { title: 'Items', bullets: [
    'The full item list, grouped by category.',
    'Descriptions, rarity, carry limit and sell value.',
    <><B>Jump to category</B> — the dropdown at the top scrolls straight to any category (Consumables, Plants, Info Books, …).</>,
    <><B>Info Books</B> (monster intel) are their own category; Treasure-Hunt items live in the Treasures tab, not here.</>,
  ] },
  { title: 'Combo List', bullets: [
    'Combination recipes: Product = Item 1 + Item 2.',
    'Success chance (colour-coded by odds) and quantity for each.',
    'Filter by Result, or pick a section: Combo List, Alchemy Book or Treasures.',
  ] },
  { title: 'Treasures', bullets: [
    'Treasure-quest items with point values.',
    'Where to find each one, and which monsters drop it during a Treasure Hunt.',
    'A ★ marks items that count toward a Guild Card award.',
  ] },
  { title: 'Kitchen', bullets: [
    'Felyne Kitchen recipes: two ingredients combine into an effect.',
    'Pick the number of Felyne chefs to see that level\'s ingredient list and recipes (more chefs unlock more).',
    <>Effects are colour-coded — <Pos>green</Pos> = beneficial, <Neg>red</Neg> = detrimental — and each ingredient category has its own colour.</>,
    'A "Felyne Whim Skills" page lists every Felyne Whim skill (MHF2 + MHFU) and what each does.',
  ] },
  { title: 'Trenya', bullets: [
    'Items Trenya brings back from his sea trips, by destination.',
    'Pick how many Pokke Points to fund him with — higher tiers yield rarer items.',
    'Rewards are grouped by category (General, Mineral, Monster, Jewel, and so on).',
  ] },
  { title: 'Pokke Farm', bullets: [
    'Items obtainable from each farm area — Mining Points, Fishing Pier, Insect Thicket, Bug Tree, and more.',
    'Each area lists its yields by upgrade tier (pick the tier from the dropdown; Field Rows shows plantable & fertilizer items).',
  ] },
  { title: 'Peddling Granny', bullets: [
    "The discount vendor's wares and prices, by inventory — she sells from a rotating stock.",
    'Pick an inventory on the left (Regular, Discount, or DLC); discount inventories list reduced prices.',
  ] },
  { title: 'Veggie Elder', bullets: [
    "The Veggie Elder's item-for-item trades, organized by zone (pick one on the left).",
    <>Each trade shows the item you hand over and its <B>Common</B> and <B>Rare</B> results (~20% chance of the Rare).</>,
    <>Search the box at the top to find a trade across <B>all zones</B> at once; each result is tagged with the zone it's in.</>,
  ] },
  { title: 'Felyne Comrades', bullets: [
    'A guide to the AI Felyne fighters you hire and train. Pick a section on the left.',
    <><B>Basic Info / Comrade Board / Growth</B> — the Comrade's stats, the kitchen board's options, and training types.</>,
    <><B>Weapons</B> — the recommended Slash / Impact weapon per attack-power tier, with each weapon's damage divider (smaller is better).</>,
    <><B>Points/Skills</B> — every trainable skill with its point cost, effect, and how to unlock it.</>,
    <><B>Hunting Behavior</B> — how Comrades aid you, gather, and fight, plus a colour-coded Temperaments table (attack preference, healing rate and target).</>,
  ] },
  { title: 'Awards', bullets: [
    'Every Guild Card award, with its icon and description.',
    'How to earn each one.',
  ] },
  { title: 'Settings', bullets: [
    <><B>App colour</B> — the background theme.</>,
    <><B>Accent colour</B> — the highlight colour (a preset or a custom pick).</>,
    <><B>App icon</B> — the monster shown by the app title and as the browser-tab favicon.</>,
    'The monster icon shown on each tab.',
    'Restore Defaults resets colour, accent, icon and tab icons.',
    'Your choices are saved in this browser.',
  ] },
  { title: 'About', bullets: [
    'Data sources & attribution.',
    'Trademarks and ownership.',
    'Disclaimers, including AI use.',
  ] },
]

const TIPS: ReactNode[] = [
  <><B>Search</B> — most list tabs have a search box at the top that filters as you type.</>,
  <><B>Wide tables</B> — tables wider than the panel scroll sideways within their own area; the rest of the page stays put.</>,
  <><B>Notes</B> — add your own notes to any monster, weapon, armor set or quest (they save as you type). Review, edit or export them all from the Notes tab.</>,
  <><B>Saved in your browser</B> — your bookmarks, notes and appearance settings are kept in this browser, so they're remembered per device.</>,
]

const SECTION_OPTIONS = ['All', ...TABS.map(t => t.title), 'Tips']

export default function HelpPage() {
  const scale = useTextScale()
  const [section, setSection] = useState('All')
  const showAll = section === 'All'
  const showTips = showAll || section === 'Tips'
  const tabs = showAll ? TABS : TABS.filter(t => t.title === section)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'transparent' }}>
      <div style={{ maxWidth: 760 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 6 }}>
          <img src={`${BASE}/assets/Misc/help_cat_black.png`} alt="" height={44} style={{ objectFit: 'contain', flexShrink: 0 }}
               onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <h1 style={{ margin: 0, fontSize: 24 * scale, fontWeight: 700, color: 'var(--text)' }}>Help for MHFU Look Up</h1>
          <img src={`${BASE}/assets/Misc/help_cat_tan.png`} alt="" height={44} style={{ objectFit: 'contain', flexShrink: 0 }}
               onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
        <p style={{ margin: '0 auto 16px', maxWidth: 620, textAlign: 'center', fontSize: 14 * scale, color: 'var(--muted)', lineHeight: 1.5 }}>
          MHFU LookUp is a reference for Monster Hunter Freedom Unite (MHP2G). Pick a tab on the left — many
          have a search box at the top. Here's what each tab covers.
        </p>

        {/* Section jump — pick a specific tab's help instead of scrolling through all of them */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <select value={section} onChange={e => setSection(e.target.value)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '5px 10px', fontSize: 13 * scale, minWidth: 200,
          }}>
            {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* The Tabs */}
        {tabs.length > 0 && (
          <>
            {showAll && <SectionTitle>The Tabs</SectionTitle>}
            {tabs.map((t, i) => (
              <div key={t.title}>
                <h3 style={{ margin: '0 0 3px', fontSize: 15 * scale, fontWeight: 600, color: 'var(--text)' }}>{t.title}</h3>
                {t.bullets.map((b, j) => <Bullet key={j}>{b}</Bullet>)}
                {showAll && i < tabs.length - 1 && <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />}
              </div>
            ))}
          </>
        )}

        {/* Tips */}
        {showTips && (
          <>
            <SectionTitle style={{ marginTop: tabs.length > 0 ? 20 : 0 }}>Tips</SectionTitle>
            {TIPS.map((t, i) => <Bullet key={i}>{t}</Bullet>)}
          </>
        )}
      </div>
    </div>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  const scale = useTextScale()
  return (
    <p style={{ margin: '0 0 3px', fontSize: 14 * scale, color: 'var(--text)', lineHeight: 1.5, display: 'flex', gap: 8 }}>
      <span style={{ color: 'var(--text)', flexShrink: 0 }}>•</span>
      <span>{children}</span>
    </p>
  )
}
function SectionTitle({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  const scale = useTextScale()
  return <h2 style={{ margin: '0 0 8px', fontSize: 18 * scale, fontWeight: 700, color: 'var(--text)', ...style }}>{children}</h2>
}
