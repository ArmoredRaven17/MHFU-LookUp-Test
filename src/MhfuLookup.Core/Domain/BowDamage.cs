using System.Text.Json.Nodes;
using MhfuLookup.Core.Data;

namespace MhfuLookup.Core.Domain;

/// <summary>The three bow shot types. Each charge level of a bow fires one of these at a level.</summary>
public enum BowShotType { Rapid, Scatter, Pierce }

/// <summary>Elemental damage type carried by a bow (status ailments are not damage elements).</summary>
public enum BowElement { None, Fire, Water, Thunder, Ice, Dragon }

/// <summary>One charge level's shot: which type and at what level it fires.</summary>
public readonly record struct BowChargeShot(int ChargeLevel, BowShotType ShotType, int ShotLevel);

/// <summary>A bow reduced to just what the damage formula needs.</summary>
public sealed record BowSpec(
    string Name,
    int Attack,
    int Affinity,
    BowElement Element,
    int ElementValue,
    IReadOnlyList<BowChargeShot> Charges,
    bool HasPowerCoating);

/// <summary>
/// Computed neutral-index damage for a single charge level. Raw is given as a min/avg/max
/// range driven by affinity: a positive-affinity bow can crit (up to ×1.25) but never lands a
/// Feeble hit, a negative-affinity bow can land Feeble hits (down to ×0.75) but never crits, and
/// a zero-affinity bow is flat (min = avg = max). Element carries no crit term, so it is a single
/// value.
/// </summary>
public readonly record struct BowChargeDamage(
    int ChargeLevel,
    BowShotType ShotType,
    int ShotLevel,
    int ArrowCount,
    double RawMin,
    double RawAvg,
    double RawMax,
    double Element,
    bool PowerApplied);

/// <summary>
/// Bow damage per the MHFU Bow Damage Formula (Boldrin, v1.00). See docs/bow-damage.md.
///
/// The ranged formula is:
///   Raw     = [ATP × Charge × Arrow × Range × Critical × Hitzone × Defense × Rage] / 1.2
///   Element = [Element × E.Charge × Hitzone × Defense × Rage] / 10   (per arrow)
///
/// For weapon-vs-weapon comparison we compute a <b>neutral index</b>: the monster- and
/// range-dependent terms (Hitzone, Defense, Rage, Range) are held at 1.0, so the numbers
/// reflect only the bow. Two differences from the single-shot examples, both faithful to
/// the formula's per-arrow rule:
///   • Raw scales with the <i>sum of arrow powers</i> (12-4-3 …).
///   • Element scales with the <i>arrow count</i> — every arrow applies full element.
/// Affinity is folded in as its expected (average) critical multiplier.
/// </summary>
public static class BowDamage
{
    // ── Constants straight from the FAQ ──────────────────────────────────────────

    // F3: arrow power per shot type and level. Raw uses the sum; element uses the count.
    private static readonly int[][] RapidPowers =
    {
        new[] { 12 }, new[] { 12, 4 }, new[] { 12, 4, 3 }, new[] { 12, 4, 3, 2 }, new[] { 12, 4, 3, 3 },
    };
    private static readonly int[][] ScatterPowers =
    {
        new[] { 4, 5, 4 }, new[] { 5, 6, 5 }, new[] { 4, 5, 5, 5, 4 }, new[] { 4, 5, 6, 5, 4 }, new[] { 5, 5, 6, 5, 5 },
    };
    private static readonly int[][] PiercePowers =
    {
        Pierce(3), Pierce(4), Pierce(5), Pierce(5), Pierce(5),
    };
    private static int[] Pierce(int hits) => Enumerable.Repeat(6, hits).ToArray();

    // F2: charge-level modifiers. Index 0 unused so [level] reads naturally.
    private static readonly double[] RawCharge = { 0, 0.4, 1.0, 1.5, 1.7 };
    private static readonly double[] ElementCharge = { 0, 0.5, 0.75, 1.0, 1.125 };

    private const double ClassDivisor = 1.2;    // all bows
    private const double ElementDivisor = 10.0; // ranged element
    private const double PowerCoatingMultiplier = 1.5;

    // ── Building blocks (public for testing / reuse) ─────────────────────────────

    /// <summary>Per-arrow power list for a shot type at a level (1–5). Clamped to range.</summary>
    public static IReadOnlyList<int> ArrowPowers(BowShotType type, int level)
    {
        var idx = Math.Clamp(level, 1, 5) - 1;
        return type switch
        {
            BowShotType.Rapid => RapidPowers[idx],
            BowShotType.Scatter => ScatterPowers[idx],
            BowShotType.Pierce => PiercePowers[idx],
            _ => Array.Empty<int>(),
        };
    }

    /// <summary>Raw (basic-damage) charge modifier for a charge level (1–4).</summary>
    public static double RawChargeMod(int level) => RawCharge[Math.Clamp(level, 1, 4)];

    /// <summary>Element charge modifier for a charge level (1–4).</summary>
    public static double ElementChargeMod(int level) => ElementCharge[Math.Clamp(level, 1, 4)];

    /// <summary>
    /// Expected critical multiplier from affinity. Positive affinity lands 1.25× crits,
    /// negative lands 0.75×; the average works out to 1 + affinity% × 0.25 for either sign.
    /// </summary>
    public static double ExpectedCritMultiplier(int affinity) => 1.0 + affinity / 100.0 * 0.25;

    /// <summary>
    /// Worst-case crit multiplier. A negative-affinity bow can land a Feeble hit (×0.75); a
    /// zero- or positive-affinity bow never does, so its floor is a normal hit (×1.0).
    /// </summary>
    public static double MinCritMultiplier(int affinity) => affinity < 0 ? 0.75 : 1.0;

    /// <summary>
    /// Best-case crit multiplier. A positive-affinity bow can land a crit (×1.25); a zero- or
    /// negative-affinity bow never does, so its ceiling is a normal hit (×1.0).
    /// </summary>
    public static double MaxCritMultiplier(int affinity) => affinity > 0 ? 1.25 : 1.0;

    // ── The comparison engine ────────────────────────────────────────────────────

    /// <summary>
    /// Neutral-index Raw and Element damage for every charge level of <paramref name="bow"/>.
    /// When <paramref name="powerCoating"/> is set, the ×1.5 Power Coating boost is applied to
    /// the Raw part — but only for bows that can actually load it (<see cref="BowSpec.HasPowerCoating"/>).
    /// </summary>
    public static IReadOnlyList<BowChargeDamage> Compute(BowSpec bow, bool powerCoating)
    {
        var pc = powerCoating && bow.HasPowerCoating;
        var critMin = MinCritMultiplier(bow.Affinity);
        var critAvg = ExpectedCritMultiplier(bow.Affinity);
        var critMax = MaxCritMultiplier(bow.Affinity);
        var result = new List<BowChargeDamage>(bow.Charges.Count);

        foreach (var shot in bow.Charges)
        {
            var arrows = ArrowPowers(shot.ShotType, shot.ShotLevel);
            var arrowSum = arrows.Sum() * 0.01;
            var arrowCount = arrows.Count;

            // Raw before crit; crit then spans Feeble … Crit per the bow's affinity sign.
            var rawBase = bow.Attack * RawChargeMod(shot.ChargeLevel) * arrowSum / ClassDivisor;
            if (pc) rawBase *= PowerCoatingMultiplier;

            var element = bow.Element == BowElement.None
                ? 0.0
                : bow.ElementValue * ElementChargeMod(shot.ChargeLevel) * arrowCount / ElementDivisor;

            result.Add(new BowChargeDamage(
                shot.ChargeLevel, shot.ShotType, shot.ShotLevel, arrowCount,
                rawBase * critMin, rawBase * critAvg, rawBase * critMax, element, pc));
        }
        return result;
    }

    // ── Parsing a stored weapon row into a BowSpec ───────────────────────────────

    private static readonly Dictionary<string, BowElement> ElementTokens = new()
    {
        ["Fir"] = BowElement.Fire, ["Wtr"] = BowElement.Water, ["Thn"] = BowElement.Thunder,
        ["Ice"] = BowElement.Ice, ["Drg"] = BowElement.Dragon,
    };

    /// <summary>
    /// Parse a stored <see cref="WeaponRow"/> into a <see cref="BowSpec"/>, or null if it
    /// isn't a usable bow (wrong type or no charge data). Element comes from the bow's
    /// <c>special</c> field (e.g. "Ice 140", "Ice 100 / Def +10"); status-coat / defense-only
    /// specials yield no element.
    /// </summary>
    public static BowSpec? Parse(WeaponRow row)
    {
        if (!string.Equals(row.Type, "Bow", StringComparison.OrdinalIgnoreCase)) return null;

        var charges = ParseCharges(row.Doc["charges"] as JsonArray);
        if (charges.Count == 0) return null;

        var (element, value) = ParseElement(row.Doc["special"]?.ToString() ?? "");
        var hasPower = row.Doc["coatings"] is JsonArray coats
                       && coats.Any(c => string.Equals(c?.ToString(), "Pwr", StringComparison.OrdinalIgnoreCase));

        return new BowSpec(row.Name, row.Atk, row.Affinity, element, value, charges, hasPower);
    }

    private static List<BowChargeShot> ParseCharges(JsonArray? arr)
    {
        var outp = new List<BowChargeShot>();
        if (arr is null) return outp;
        for (var i = 0; i < arr.Count; i++)
        {
            var parts = (arr[i]?.ToString() ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2 || !Enum.TryParse<BowShotType>(parts[0], ignoreCase: true, out var type)) continue;
            if (!int.TryParse(parts[1], out var level)) continue;
            outp.Add(new BowChargeShot(i + 1, type, level));
        }
        return outp;
    }

    private static (BowElement, int) ParseElement(string special)
    {
        // "special" may chain segments with '/', e.g. "Ice 100 / Def +10". Take the first
        // segment that names a damage element.
        foreach (var seg in special.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            var t = seg.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (t.Length >= 2 && ElementTokens.TryGetValue(t[0], out var el) && int.TryParse(t[1], out var v))
                return (el, v);
        }
        return (BowElement.None, 0);
    }
}
