# Bow Damage & Comparison

The bow comparison modal ranks two bows on expected Raw and Element damage at each charge level. It's
an intentional **hidden / personal feature** — there is no button. Typing **`compare`** (case-insensitive)
into the Weapon page's search box opens it (see [`WeaponPage.SearchBox_TextChanged`](../src/MhfuLookup.App/Views/WeaponPage.xaml.cs)).
The maths lives in [`BowDamage`](../src/MhfuLookup.Core/Domain/BowDamage.cs) (Core, unit-tested in
[`BowDamageTests`](../tests/MhfuLookup.Core.Tests/BowDamageTests.cs)); the UI is the self-contained
[`BowCompareDialog`](../src/MhfuLookup.App/Views/BowCompareDialog.cs).

## Sources

The formula was cross-confirmed by the project owner (Armored_Raven) against two community FAQs
published on GameFAQs:

- **MHFU** — *Bow Damage Formula FAQ* by **Boldrin** (v1.00, 2009) — the primary source; the app
  targets MHFU, so its constants (charge Lv4 = 1.7, re-tuned arrow values, Level-5 shots) are the ones
  implemented.
- **Monster Hunter Freedom 2 (MHP2)** — *Bow Damage Formula FAQ* by **Deathslayer31 / Brian VanWulfen**
  (v1.11, 2007) — the base-game FAQ, used as a sanity check. It agrees with the MHFU FAQ everywhere the
  two games share mechanics and differs only in the known MHFU re-tuning (Lv4 charge 1.5 → 1.7, arrow
  values, no Level-5 shots) — which independently corroborates the shared formula.

This attribution also appears in the in-app **About** screen under "Bow damage formula (verification)".

## Source formula

From the MHFU Bow Damage Formula FAQ (Boldrin, v1.00). Total shot damage = Raw + Element:

```
Raw     = [ATP × Charge × Arrow × Range × Critical × Hitzone × Defense × Rage] / 1.2
Element = [Element × E.Charge × Hitzone × Defense × Rage] / 10     (per arrow)
```

Key tables baked into `BowDamage`:

- **Arrow power (F3)** — per shot type/level, e.g. Rapid 4 = `12-4-3-2`, Scatter 2 = `5-6-5`,
  Pierce 3 = `6×5`. Raw uses the **sum** of these; Element uses the **count** (every arrow applies
  full element).
- **Charge modifiers (F2)** — Raw: `0.4 / 1.0 / 1.5 / 1.7`; Element: `0.5 / 0.75 / 1.0 / 1.125`
  for charge levels 1–4.

Each bow fires a specific shot type+level at each charge level — stored per-bow in the `charges`
array (`["Rapid 2", "Pierce 3", "Rapid 4", "Scatter 4"]`, index = charge level). Bows have 3 or 4
charge levels.

## The "neutral index"

For a bow-vs-bow comparison we don't pick a monster. The monster/range terms — **Hitzone, Defense,
Rage, Range** — are all held at `1.0`, so the numbers reflect only the weapon:

```
Raw(charge)     = Attack × RawChargeMod × Σ(arrowPower)×0.01 × ExpectedCrit × [Power] / 1.2
Element(charge) = ElementValue × ElementChargeMod × arrowCount / 10
```

- **Affinity → Raw Min/Avg/Max.** Crit is a per-hit outcome, so Raw is reported as a range driven by
  the bow's affinity *sign*:
  - **Positive affinity** can crit but never lands a Feeble hit → Min ×1.0 (normal), Max ×1.25 (crit).
  - **Negative affinity** can land Feeble hits but never crits → Min ×0.75 (Feeble), Max ×1.0 (normal).
  - **Zero affinity** is flat → Min = Avg = Max.
  - **Avg** is the expected value `1 + affinity% × 0.25` (the long-run average across hits).
  Crit applies to Raw only — Element has no crit term and stays single-valued.
- **Power Coating** toggle applies ×1.5 to **Raw only**, and only for bows that can actually load it
  (`Pwr` in `coatings`). Element is left unboosted.

These indices are proportional to real damage, so the relative ordering of two bows is faithful; the
absolute numbers are not predicted hits on any monster. A future enhancement could swap the held-1.0
terms for a real monster/hitzone/range selection — `BowDamage.Compute` is structured so that layers on
cleanly.

### Best-case assumption

The numbers assume **every arrow / hit lands within critical distance** — a simple best case. Two
consequences worth knowing:

- **Critical distance is neutral for ranking.** The sweet-spot Range modifier (×1.5) is the same value
  for all three shot types, so it scales every bow's Raw uniformly and never changes which bow wins. We
  hold Range at 1.0 rather than 1.5 to keep the index honest about not being a specific shot.
- **"All hits land" flatters multi-arrow shots.** Raw sums the full arrow-power list and Element uses
  the full hit count, so Scatter (pellets fan out) and Pierce (needs a long, aligned body) read at their
  theoretical ceiling, while Rapid (arrows stack on one spot) is the most realistic. A single **shot-type
  legend** above the tables explains how each type behaves once; each bow's column then carries its own
  **shot-pattern reference** — the shot type+levels *that bow* fires (in charge order), each with its
  per-arrow pattern and hit count.

## Simulate (felt burst)

Min/Avg/Max states the affinity *envelope*, but not what variance *feels* like. The **Simulate**
button ([`BowSimulator`](../src/MhfuLookup.Core/Domain/BowSimulator.cs)) fires a 20-shot burst at a
chosen charge level for both bows and draws each shot as a bar (height ∝ raw, tinted green when a shot
rolled above a normal hit, red when below), with a summary of Avg / Low / High and the crit-or-Feeble
rate. Each **arrow** rolls its own crit/Feeble independently (per the formula's per-hit `CRITICAL`
term), so multi-arrow shots come out visibly steadier than single-arrow ones, and a −40% bow's strip
reads jagged-and-low next to a +20% bow's tight-and-high. `BowSimulator.Simulate` takes an injected
`Random` so it's deterministic under test; over many shots its mean converges to the analytic Avg and
its crit rate to the bow's affinity.

## Validation

`BowDamageTests` asserts the arrow/charge constants against the FAQ and reproduces the FAQ's worked
single-shot example (Dragonhead Harp III on Rathalos → 29 raw + 9 element) end-to-end from the same
building blocks.
