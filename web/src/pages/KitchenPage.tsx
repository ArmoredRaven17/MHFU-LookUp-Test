import { useEffect, useMemo, useState } from 'react'
import { loadKitchen } from '../data/loaders'
import type { FoodRecipe, WhimSkill } from '../types'
import SearchBox from '../components/SearchBox'

const INGREDIENTS = ['Meat', 'Bran', 'Fish', 'Fruit', 'Veggie', 'Dairy']

function effectColor(effect: string) {
  if (effect === 'No Effect') return 'var(--muted)'
  if (effect.startsWith('-')) return 'var(--negative)'
  if (effect.startsWith('+')) return 'var(--positive)'
  return 'var(--text)'
}

export default function KitchenPage() {
  const [recipes, setRecipes] = useState<FoodRecipe[]>([])
  const [whims, setWhims] = useState<WhimSkill[]>([])
  const [view, setView] = useState<'recipes' | 'whims'>('recipes')
  const [chefs, setChefs] = useState(1)
  const [whimSearch, setWhimSearch] = useState('')

  useEffect(() => {
    loadKitchen().then(d => { setRecipes(d.recipes); setWhims(d.whim_skills) })
  }, [])

  // Build lookup: ingredient1 + ingredient2 → effect for current chef count
  const recipeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of recipes) {
      if (r.chefs === chefs) {
        map.set(`${r.ingredient1}|${r.ingredient2}`, r.effect)
        map.set(`${r.ingredient2}|${r.ingredient1}`, r.effect)
      }
    }
    return map
  }, [recipes, chefs])

  const filteredWhims = useMemo(() => {
    if (!whimSearch) return whims
    const s = whimSearch.toLowerCase()
    return whims.filter(w => w.name.toLowerCase().includes(s) || w.description.toLowerCase().includes(s))
  }, [whims, whimSearch])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* ── Top tabs ── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '6px 12px', display: 'flex', gap: 4, alignItems: 'center' }}>
        {(['recipes', 'whims'] as const).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '3px 12px', fontSize: 12, border: '1px solid var(--border)',
            borderRadius: 3, cursor: 'pointer',
            background: view === v ? 'var(--accent)' : 'var(--surface)',
            color: view === v ? '#111' : 'var(--muted)',
            fontWeight: view === v ? 600 : 400,
          }}>
            {v === 'recipes' ? 'Recipe Matrix' : 'Whim Skills'}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {view === 'recipes' ? (
          <>
            {/* Chef count selector */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 4 }}>Chefs:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setChefs(n)} style={{
                  width: 30, height: 26, fontSize: 12, border: '1px solid var(--border)',
                  borderRadius: 3, cursor: 'pointer',
                  background: chefs === n ? 'var(--accent)' : 'var(--surface)',
                  color: chefs === n ? '#111' : 'var(--muted)',
                  fontWeight: chefs === n ? 600 : 400,
                }}>
                  {n}
                </button>
              ))}
            </div>

            {/* Recipe grid */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="tbl-header" style={{ width: 70, textAlign: 'left' }}>↓ / →</th>
                    {INGREDIENTS.map(ing => (
                      <th key={ing} className="tbl-header" style={{ textAlign: 'center', minWidth: 110 }}>
                        {ing}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INGREDIENTS.map((ing1, ri) => (
                    <tr key={ing1} className="tbl-row">
                      <td className="tbl-cell" style={{ fontWeight: 600, color: 'var(--accent)', fontSize: 12 }}>
                        {ing1}
                      </td>
                      {INGREDIENTS.map((ing2, ci) => {
                        const effect = recipeMap.get(`${ing1}|${ing2}`) ?? '—'
                        const isDiag = ri === ci
                        return (
                          <td key={ing2} className="tbl-cell" style={{
                            textAlign: 'center', fontSize: 11,
                            color: effectColor(effect),
                            background: isDiag ? 'rgba(200,168,75,0.06)' : undefined,
                          }}>
                            {effect}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div style={{ maxWidth: 400, marginBottom: 12 }}>
              <SearchBox value={whimSearch} onChange={setWhimSearch} placeholder="Search whim skills…" />
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 700 }}>
              <thead>
                <tr>
                  <th className="tbl-header" style={{ textAlign: 'left', width: 180 }}>Skill</th>
                  <th className="tbl-header" style={{ textAlign: 'left' }}>Effect</th>
                </tr>
              </thead>
              <tbody>
                {filteredWhims.map((w, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{w.name}</td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)', fontSize: 12 }}>{w.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredWhims.length === 0 && (
              <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No whim skills found.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
