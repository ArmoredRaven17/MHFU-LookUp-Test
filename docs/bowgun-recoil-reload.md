# Bowgun Recoil & Reload — effective rating formula

How a bowgun's per-ammo raw Recoil/Reload numbers (from the *Bowgun Damage Guide*,
VampireCosmonaut / GameFAQs) combine with the gun's own Recoil/Reload rating to produce the
*effective* rating you feel in-game. Source: MHFU community bowgun guide (provided by the user).

The per-ammo raw numbers are shown in the Bowgun Ammo reference sheet; each gun's own rating is a
word stored in the weapon data (e.g. Recoil "Moderate", Reload "Normal").

## Recoil

```
Adjusted Recoil = Ammo Recoil − Bowgun Recoil Value
```

Bowgun Recoil Value (the gun's word → number):

| Rating    | Value |
|-----------|-------|
| Strong    | 1 |
| Moderate  | 2 |
| Light     | 3 |
| Weak      | 4 |
| Very Weak | 5 |
| Weakest   | 6 |

Adjusted Recoil → effective rating:

| Adjusted | Rating         | Recovery |
|----------|----------------|----------|
| ≤ 8      | Recoilless     | 1 s   |
| 9 – 10   | Weak Recoil    | 2 s   |
| 11 +     | Strong Recoil  | 2.5 s |

## Reload

```
Adjusted Reload = Ammo Reload − Bowgun Reload Value
```

Bowgun Reload Value (the gun's word → number):

| Rating    | Value |
|-----------|-------|
| Fastest   |  6 |
| SuperFast |  5 |
| VeryFast  |  4 |
| Fast      |  3 |
| Normal    |  2 |
| Slow      |  1 |
| VerySlow  |  0 |
| SuperSlow | −1 |
| Slowest   | −2 |

Adjusted Reload → effective rating:

| Adjusted | Rating | Reload Time |
|----------|--------|-------------|
| ≤ 4      | Fast   | 2 s   |
| 5 – 7    | Medium | 2.5 s |
| 8 +      | Slow   | 3.5 s |

## Worked examples

- Crag S Lv3 (ammo recoil 13) on a Moderate gun (2): 13 − 2 = 11 → **Strong Recoil (2.5 s)**.
- Crag S Lv3 on a Weakest gun (6): 13 − 6 = 7 → **Recoilless (1 s)**.
- Clust S Lv3 (ammo reload 10) on a Normal gun (2): 10 − 2 = 8 → **Slow reload (3.5 s)**.
- Normal S Lv1 (ammo reload 5) on a Normal gun (2): 5 − 2 = 3 → **Fast reload (2 s)**.

## Notes / caveats

- Skills shift the gun's base rating before the subtraction: Recoil Reduction +1/+2 and
  Reloading Speed +1/+2/+3 / AutoReload (armor-skill IDs 21 / 20 / 99). Their exact step size is
  not yet reverse-engineered here.
- Bucket boundaries: the guide labels the low recoil band "Below 8"; treated here as ≤ 8 (so an
  adjusted value of exactly 8 is Recoilless). Reload low band "Below 4" treated as ≤ 4.
- This is a community-guide formula, not ROM-extracted; validate against in-game behaviour before
  treating it as authoritative.
