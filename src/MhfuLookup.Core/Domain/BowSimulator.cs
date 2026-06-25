namespace MhfuLookup.Core.Domain;

/// <summary>One simulated shot: its rolled raw damage and how the per-arrow crit rolls fell.</summary>
public readonly record struct SimShot(double Raw, int Crits, int Feebles);

/// <summary>Result of simulating a burst of shots at one charge level.</summary>
public sealed record BowSimulation(
    BowChargeShot Shot,
    IReadOnlyList<SimShot> Shots,
    double NormalRaw,   // a shot with every arrow a normal (×1.0) hit — the reference line
    double AvgRaw,
    double MinRaw,
    double MaxRaw,
    int Arrows,         // arrows per shot
    int TotalHits,      // arrows × shots
    int TotalCrits,
    int TotalFeebles,
    double Element);    // constant per shot (no crit term)

/// <summary>
/// Monte-Carlo "felt burst" simulator for a single charge level. Each arrow rolls its own
/// crit/Feeble independently from the bow's affinity (per the formula's per-hit CRITICAL term),
/// so multi-arrow shots are naturally steadier than single-arrow ones. Uses the same neutral-index
/// basis as <see cref="BowDamage"/> (hitzone/defense/rage/range = 1.0); only the crit rolls vary.
/// </summary>
public static class BowSimulator
{
    private const double ClassDivisor = 1.2;
    private const double PowerCoatingMultiplier = 1.5;

    /// <summary>
    /// Fire <paramref name="shots"/> shots of <paramref name="shot"/> and record each one.
    /// <paramref name="rng"/> is injected so callers (and tests) control randomness.
    /// </summary>
    public static BowSimulation Simulate(BowSpec bow, BowChargeShot shot, bool powerCoating, int shots, Random rng)
    {
        var arrows = BowDamage.ArrowPowers(shot.ShotType, shot.ShotLevel);
        var pc = powerCoating && bow.HasPowerCoating;

        // Per-arrow raw before its crit roll: ATP × charge mod × (power × 0.01) / 1.2 [× 1.5 power coat].
        var chargeMod = BowDamage.RawChargeMod(shot.ChargeLevel);
        var coat = pc ? PowerCoatingMultiplier : 1.0;
        double ArrowBase(int power) => bow.Attack * chargeMod * (power * 0.01) / ClassDivisor * coat;

        var normalRaw = arrows.Sum(ArrowBase);   // every arrow ×1.0
        var element = bow.Element == BowElement.None
            ? 0.0
            : bow.ElementValue * BowDamage.ElementChargeMod(shot.ChargeLevel) * arrows.Count / 10.0;

        var rolled = new List<SimShot>(shots);
        int totalCrits = 0, totalFeebles = 0;
        double min = double.MaxValue, max = double.MinValue, sum = 0;

        for (var s = 0; s < shots; s++)
        {
            double raw = 0;
            int crits = 0, feebles = 0;
            foreach (var power in arrows)
            {
                var m = RollCrit(bow.Affinity, rng);
                if (m > 1.0) crits++; else if (m < 1.0) feebles++;
                raw += ArrowBase(power) * m;
            }
            rolled.Add(new SimShot(raw, crits, feebles));
            totalCrits += crits; totalFeebles += feebles; sum += raw;
            if (raw < min) min = raw;
            if (raw > max) max = raw;
        }

        if (shots == 0) { min = max = 0; }

        return new BowSimulation(
            shot, rolled, normalRaw,
            shots == 0 ? 0 : sum / shots, min, max,
            arrows.Count, arrows.Count * shots, totalCrits, totalFeebles, element);
    }

    /// <summary>
    /// One crit roll: positive affinity has that % chance of a crit (×1.25), negative that % chance
    /// of a Feeble hit (×0.75); otherwise a normal hit (×1.0). Affinity beyond ±100 is clamped.
    /// </summary>
    private static double RollCrit(int affinity, Random rng)
    {
        if (affinity == 0) return 1.0;
        var chance = Math.Min(1.0, Math.Abs(affinity) / 100.0);
        if (rng.NextDouble() < chance) return affinity > 0 ? 1.25 : 0.75;
        return 1.0;
    }
}
