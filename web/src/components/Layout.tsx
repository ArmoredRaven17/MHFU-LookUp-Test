import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BASE } from '../utils/assets'
import { useTabIcons } from '../theme/tabIcons'
import { useAppIcon } from '../theme/appearance'
import { useTextScale } from '../theme/textScale'
import { resolveIconSrc } from '../theme/iconCatalog'

export interface NavItem {
  path: string
  label: string
  icon: string  // default monster id used as icon
}

// Content tabs (order + default icons). Exported so Settings → Tab Icons reuses the list.
// Icons are `category:id` values resolved via theme/iconCatalog.ts's resolveIconSrc() — these
// are the user's own hand-picked defaults (baked in from their live Settings selections).
export const NAV: NavItem[] = [
  { path: 'bookmarks',  label: 'Bookmarks',       icon: 'item:MH4G-Book_Icon_Red' },
  { path: 'notes',      label: 'Notes',            icon: 'item:MH4G-Book_Icon_Blue' },
  { path: 'monsters',   label: 'Monsters',         icon: 'monster:nargacuga' },
  { path: 'weapons',    label: 'Weapons',          icon: 'weapon:Great_Sword' },
  { path: 'armorsets',  label: 'Armor Sets',       icon: 'armor:chest_R6' },
  { path: 'armorskills',label: 'Armor Skills',     icon: 'monster:daimyo_hermitaur' },
  { path: 'decorations',label: 'Decorations',      icon: 'decocolor:blue' },
  { path: 'quests',     label: 'Quests',           icon: 'item:MH4G-Ticket_Icon_White' },
  { path: 'training',   label: 'Training School',  icon: 'item:MH4G-Coin_Icon_Pink' },
  { path: 'gathering',  label: 'Gathering',        icon: 'item:MH4G-Bugnet_Icon_Yellow' },
  { path: 'items',      label: 'Items',            icon: 'item:MH4G-Medicine_Icon_Green' },
  { path: 'combolist',  label: 'Combo List',       icon: 'item:MH4G-Book_Icon_Grey' },
  { path: 'treasures',  label: 'Treasures',        icon: 'award:award_042' },
  { path: 'kitchen',    label: 'Kitchen',          icon: 'item:MH4G-Meat_Icon_Orange' },
  { path: 'trenya',     label: 'Trenya',           icon: 'award:award_043' },
  { path: 'pokke',      label: 'Pokke Farm',       icon: 'item:MH4G-Webbing_Icon_Orange' },
  { path: 'granny',     label: 'Peddling Granny',  icon: 'item:MH4G-Sac_Icon_Grey' },
  { path: 'veggie',     label: 'Veggie Elder',     icon: 'item:MH4G-Ticket_Icon_Yellow' },
  { path: 'comrades',   label: 'Felyne Comrades',  icon: 'monster:felyne' },
  { path: 'awards',     label: 'Awards',           icon: 'award:award_011' },
  { path: 'settings',   label: 'Settings',         icon: 'award:award_023' },
  { path: 'help',       label: 'Help',             icon: 'award:award_024' },
  { path: 'about',      label: 'About',            icon: 'monster:fatalis' },
]

// Icon-only nav tab — the full label is a native title-attribute tooltip on hover, since 23 tabs
// don't fit in one horizontal row with visible text.
function NavIcon({ item, iconId, active }: { item: NavItem; iconId: string; active: boolean }) {
  return (
    <NavLink
      to={`/${item.path}`}
      title={item.label}
      className={active ? 'nav-tab active' : 'nav-tab'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: '100%', flexShrink: 0,
        textDecoration: 'none',
      }}
    >
      <img src={resolveIconSrc(iconId)} alt={item.label} width={24} height={24}
           style={{ objectFit: 'contain', flexShrink: 0 }}
           onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
    </NavLink>
  )
}

export default function Layout() {
  const loc = useLocation()
  const overrides = useTabIcons()
  const appIcon = useAppIcon()
  const scale = useTextScale()
  const isActive = (path: string) => loc.pathname === `/${path}` || loc.pathname.startsWith(`/${path}/`)

  // Touch devices can leave the just-tapped nav link in a lingering :focus/:active state after a
  // client-side route change (no real blur fires the way a mouse click+release cycle would), which
  // visually reads as "still selected" even once the route — and the real .active class — has moved
  // on to a different tab. Explicitly deselect it on every navigation so nothing stays highlighted.
  useEffect(() => {
    const el = document.activeElement
    if (el instanceof HTMLElement && el.closest('nav')) el.blur()
  }, [loc.pathname])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Top nav bar ── */}
      <nav style={{
        height: 48, minHeight: 48,
        backgroundColor: 'var(--surface)',
        // Repeating texture under a translucent surface-coloured overlay (theme-aware, readable).
        backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.93), rgba(var(--surface-rgb), 0.93)), url(${BASE}/assets/Textures/surface_bg.png)`,
        backgroundRepeat: 'no-repeat, repeat',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        {/* App title */}
        <div style={{ padding: '0 12px', height: '100%', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src={`${BASE}/assets/Monsters/${appIcon}.png`} alt="" width={26} height={26} style={{ objectFit: 'contain' }}
               onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 * scale, whiteSpace: 'nowrap' }}>MHFU LookUp</span>
        </div>

        {/* Nav icons */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1, overflowX: 'auto' }}>
          {NAV.map(item => (
            <NavIcon key={item.path} item={item} iconId={overrides[item.path] ?? item.icon} active={isActive(item.path)} />
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--panel)',
        // Repeating texture with a translucent panel-coloured overlay (theme-aware) + a darkening layer.
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.30), rgba(0, 0, 0, 0.30)), linear-gradient(rgba(var(--panel-rgb), 0.88), rgba(var(--panel-rgb), 0.88)), url(${BASE}/assets/Textures/nav_bg.png)`,
        backgroundRepeat: 'no-repeat, no-repeat, repeat',   // overlays fill; texture tiles at native 128px, not stretched
      }}>
        <Outlet />
      </main>
    </div>
  )
}
