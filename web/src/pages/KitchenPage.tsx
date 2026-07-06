import { useEffect, useMemo, useState } from 'react'
import { loadKitchen } from '../data/loaders'
import type { FoodRecipe, FoodIngredient, WhimSkill } from '../types'
import { BASE } from '../utils/assets'

const WHIM_PAGE = 0

interface ChefOption { chefs: number; label: string }

// Muted for "No Effect"/blank, negative if it contains a negative number, else positive.
function effectColor(effect: string) {
  if (!effect || effect.toLowerCase() === 'no effect') return 'var(--muted)'
  return /-\d/.test(effect) ? 'var(--negative)' : 'var(--positive)'
}

// Distinct colour per ingredient category (the legend doubles as the key).
const INGREDIENT_COLORS: Record<string, string> = {
  Meat: '#e07a7a', Fish: '#6aa8e0', Bran: '#d9b36a', Fruit: '#e0985d',
  Veggie: '#73cb8d', Dairy: '#e8dca0', Milk: '#bcd4e6', Drink: '#b895e0',
}
const ingredientColor = (name: string) => INGREDIENT_COLORS[name] ?? 'var(--text)'

export default function KitchenPage() {
  const [recipes, setRecipes] = useState<FoodRecipe[]>([])
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])
  const [whims, setWhims] = useState<WhimSkill[]>([])
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    loadKitchen().then(d => { setRecipes(d.recipes); setIngredients(d.ingredients ?? []); setWhims(d.whim_skills) })
  }, [])

  // Chef levels (from distinct recipe chef counts) + a Whim-skills page.
  const chefOptions = useMemo<ChefOption[]>(() => {
    const counts = [...new Set(recipes.map(r => r.chefs))].sort((a, b) => a - b)
    const opts = counts.map(n => ({ chefs: n, label: `${n} Felyne Chef${n === 1 ? '' : 's'}` }))
    if (whims.length > 0) opts.push({ chefs: WHIM_PAGE, label: 'Felyne Whim Skills' })
    return opts
  }, [recipes, whims])

  // Default to the first option once data loads.
  useEffect(() => { if (selected === null && chefOptions.length > 0) setSelected(chefOptions[0].chefs) }, [chefOptions, selected])

  const current = chefOptions.find(o => o.chefs === selected) ?? null
  const isWhim = selected === WHIM_PAGE
  const legend = useMemo(() => ingredients.filter(i => i.chefs === selected), [ingredients, selected])
  const chefRecipes = useMemo(() => recipes.filter(r => r.chefs === selected), [recipes, selected])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Chef-level / Whim selector ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)', overflowY: 'auto',
      }}>
        {chefOptions.map(o => {
          const active = o.chefs === selected
          return (
            <button key={o.chefs} onClick={() => setSelected(o.chefs)} style={{
              display: 'block', width: '100%', padding: '7px 12px',
              background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
              border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              color: active ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
            }}>{o.label}</button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
        <h2 style={{ margin: 0, padding: '12px 16px 6px', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{current?.label ?? ''}</h2>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {isWhim ? (
            <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 700 }}>
              <thead>
                <tr>
                  <th className="tbl-header" style={{ textAlign: 'left', width: 200 }}>Skill</th>
                  <th className="tbl-header" style={{ textAlign: 'left' }}>Effect</th>
                </tr>
              </thead>
              <tbody>
                {whims.map((w, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{w.name}</td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{w.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <>
              {/* Ingredient legend */}
              {legend.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {legend.map((l, i) => (
                    <p key={i} style={{ margin: '0 0 1px', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: ingredientColor(l.category) }}>{l.category}</span>
                      <span style={{ color: 'var(--muted)' }}>: {l.items}</span>
                    </p>
                  ))}
                </div>
              )}

              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 640 }}>
                <thead>
                  <tr>
                    <th className="tbl-header" style={{ textAlign: 'left', width: 150 }}>Ingredient 1</th>
                    <th className="tbl-header" />
                    <th className="tbl-header" style={{ textAlign: 'left', width: 150 }}>Ingredient 2</th>
                    <th className="tbl-header" />
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Result / Effect</th>
                  </tr>
                </thead>
                <tbody>
                  {chefRecipes.map((r, i) => (
                    <tr key={i} className="tbl-row">
                      <td className="tbl-cell" style={{ color: ingredientColor(r.ingredient1), fontWeight: 600 }}>{r.ingredient1}</td>
                      <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>+</td>
                      <td className="tbl-cell" style={{ color: ingredientColor(r.ingredient2), fontWeight: 600 }}>{r.ingredient2}</td>
                      <td className="tbl-cell" style={{ color: 'var(--muted)', textAlign: 'center' }}>→</td>
                      <td className="tbl-cell" style={{ fontWeight: 600, color: effectColor(r.effect) }}>{r.effect}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
