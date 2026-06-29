import { NavLink, Outlet, useLocation } from 'react-router-dom'

interface NavItem {
  path: string
  label: string
  icon: string  // monster id used as icon
}

const NAV: NavItem[] = [
  { path: 'bookmarks',  label: 'Bookmarks',       icon: 'anteka' },
  { path: 'notes',      label: 'Notes',            icon: 'remobra' },
  { path: 'monsters',   label: 'Monsters',         icon: 'tigrex' },
  { path: 'weapons',    label: 'Weapons',          icon: 'rathalos' },
  { path: 'armorsets',  label: 'Armor Sets',       icon: 'rathian' },
  { path: 'armorskills',label: 'Armor Skills',     icon: 'daimyo_hermitaur' },
  { path: 'decorations',label: 'Decorations',      icon: 'great_thunderbug' },
  { path: 'quests',     label: 'Quests',           icon: 'yian_kut_ku' },
  { path: 'training',   label: 'Training School',  icon: 'diablos' },
  { path: 'gathering',  label: 'Gathering',        icon: 'kelbi' },
  { path: 'items',      label: 'Items',            icon: 'melynx' },
  { path: 'combolist',  label: 'Combo List',       icon: 'congalala' },
  { path: 'treasures',  label: 'Treasures',        icon: 'bulldrome' },
  { path: 'kitchen',    label: 'Kitchen',          icon: 'mosswine' },
  { path: 'trenya',     label: 'Trenya',           icon: 'plesioth' },
  { path: 'pokke',      label: 'Pokke Farm',       icon: 'basarios' },
  { path: 'granny',     label: 'Peddling Granny',  icon: 'gypceros' },
  { path: 'veggie',     label: 'Veggie Elder',     icon: 'shakalaka' },
  { path: 'comrades',   label: 'Felyne Comrades',  icon: 'felyne' },
  { path: 'awards',     label: 'Awards',           icon: 'kirin' },
  { path: 'about',      label: 'About',            icon: 'fatalis' },
]

export default function Layout() {
  const loc = useLocation()

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <nav
        style={{
          width: 220,
          minWidth: 220,
          background: 'var(--panel)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Title bar */}
        <div style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <img
            src="/assets/Monsters/rathalos.png"
            alt=""
            width={28}
            height={28}
            style={{ objectFit: 'contain' }}
          />
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>
            MHFU LookUp
          </span>
        </div>

        {/* Nav items */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {NAV.map(item => {
            const active = loc.pathname === `/${item.path}` ||
              loc.pathname.startsWith(`/${item.path}/`)
            return (
              <NavLink
                key={item.path}
                to={`/${item.path}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 12px',
                  textDecoration: 'none',
                  color: active ? 'var(--accent)' : 'var(--text)',
                  background: active ? 'rgba(200,168,75,0.12)' : 'transparent',
                  borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  fontSize: 13,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                <img
                  src={`/assets/Monsters/${item.icon}.png`}
                  alt=""
                  width={20}
                  height={20}
                  style={{ objectFit: 'contain', flexShrink: 0 }}
                />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  )
}
