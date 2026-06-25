using System.Text.Json.Nodes;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.ViewModels;

/// <summary>Weapon filter state + matching, ported from app/weapon_filter.py.</summary>
public sealed class WeaponFilter
{
    public string Name = "";
    public HashSet<string> Elements = new();         // keys: Raw, Fir, Wtr, Thn, Ice, Drg, Poi, Par, Slp
    public int MinAtk;
    public string Affinity = "any";                  // any | positive | negative
    public int MinSlots;                             // 0=Any, 1, 2, 3
    public bool DefBonus;
    public string MinSharpness = "Any";              // Any | Yellow | Green | Blue | White | Purple
    public HashSet<string> Coatings = new();
    public Dictionary<string, int> ShotTypes = new(); // type -> min level
    public HashSet<string> AmmoRaw = new();
    public HashSet<string> AmmoSupport = new();
    public HashSet<string> AmmoElement = new();
    public HashSet<string> AmmoOther = new();
    // Hunting Horn note letters the horn must have: [0]=first note (W/P), [1],[2]=other colours ("" = any).
    public string[] Notes = { "", "", "" };
    // Gunlance shelling: type ("" = any | Normal | Long | Spread) and minimum level (0 = any, else 1..5).
    public string ShellType = "";
    public int ShellLevelMin;

    public static readonly HashSet<string> MeleeTypes = new()
        { "Great Sword", "Long Sword", "Sword & Shield", "Dual Blades", "Hammer", "Hunting Horn" };

    private static readonly Dictionary<string, int> SharpIndex = new()
        { ["Yellow"] = 2, ["Green"] = 3, ["Blue"] = 4, ["White"] = 5, ["Purple"] = 6 };

    public bool IsActive =>
        Name.Length > 0 || Elements.Count > 0 || MinAtk > 0 || Affinity != "any" || MinSlots > 0
        || DefBonus || MinSharpness != "Any" || Coatings.Count > 0 || ShotTypes.Count > 0
        || AmmoRaw.Count > 0 || AmmoSupport.Count > 0 || AmmoElement.Count > 0 || AmmoOther.Count > 0
        || Notes.Any(n => n.Length > 0) || ShellType.Length > 0 || ShellLevelMin > 0;

    public bool Matches(WeaponRow w, string type)
    {
        var d = w.Doc;

        if (Name.Length > 0 && !w.Name.Contains(Name, StringComparison.OrdinalIgnoreCase)) return false;
        if (Elements.Count > 0 && !Elements.Overlaps(WeaponElements(d))) return false;
        if (MinAtk > 0 && w.Atk < MinAtk) return false;
        if (Affinity == "positive" && w.Affinity <= 0) return false;
        if (Affinity == "negative" && w.Affinity >= 0) return false;
        if (w.Slots < MinSlots) return false;
        if (DefBonus && AsInt(d["def_bonus"]) == 0) return false;

        if (MeleeTypes.Contains(type) && MinSharpness != "Any")
        {
            var idx = SharpIndex[MinSharpness];
            var sharp = (d["sharpness_plus1"] as JsonArray) ?? (d["sharpness"] as JsonArray);
            var ok = false;
            if (sharp is not null)
                for (var i = idx; i < 7 && i < sharp.Count; i++)
                    if (AsInt(sharp[i]) > 0) { ok = true; break; }
            if (!ok) return false;
        }

        if (Coatings.Count > 0)
        {
            var cs = (d["coatings"] as JsonArray)?.Select(x => x?.ToString() ?? "").ToHashSet() ?? new();
            if (!Coatings.Overlaps(cs)) return false;
        }

        if (ShotTypes.Count > 0)
        {
            var weaponMax = new Dictionary<string, int>();
            if (d["charges"] is JsonArray ch)
                foreach (var c in ch)
                {
                    var parts = (c?.ToString() ?? "").Split(' ');
                    if (parts.Length == 2 && int.TryParse(parts[1], out var lvl) && lvl > weaponMax.GetValueOrDefault(parts[0]))
                        weaponMax[parts[0]] = lvl;
                }
            foreach (var (st, min) in ShotTypes)
                if (weaponMax.GetValueOrDefault(st) < min) return false;
        }

        if (AmmoRaw.Count > 0 && !AmmoMatches(AmmoRaw, d["ammo_raw"] as JsonObject)) return false;
        if (AmmoSupport.Count > 0 && !AmmoMatches(AmmoSupport, d["ammo_support"] as JsonObject)) return false;
        if (AmmoElement.Count > 0 && !AmmoMatches(AmmoElement, d["ammo_element"] as JsonObject)) return false;
        if (AmmoOther.Count > 0 && !AmmoMatches(AmmoOther, d["ammo_other"] as JsonObject)) return false;

        if (type == "Hunting Horn" && Notes.Any(n => n.Length > 0))
        {
            var hh = (d["notes"] as JsonArray)?.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0).ToList()
                     ?? new List<string>();
            if (hh.Count == 0) return false;
            // First note must match (when chosen).
            if (Notes[0].Length > 0 && hh[0] != Notes[0]) return false;
            // The chosen 2nd/3rd notes must be present among the horn's other notes (as a multiset).
            var want = new[] { Notes[1], Notes[2] }.Where(s => s.Length > 0);
            var others = hh.Skip(1).ToList();
            foreach (var grp in want.GroupBy(x => x))
                if (others.Count(o => o == grp.Key) < grp.Count()) return false;
        }

        if (type == "Gunlance" && (ShellType.Length > 0 || ShellLevelMin > 0))
        {
            var parts = (d["shelling"]?.ToString() ?? "").Split(' ');
            var st = parts.Length > 0 ? parts[0] : "";
            var lvl = parts.Length > 1 && int.TryParse(parts[1], out var v) ? v : 0;
            if (ShellType.Length > 0 && st != ShellType) return false;
            if (ShellLevelMin > 0 && lvl < ShellLevelMin) return false;
        }

        return true;
    }

    private static HashSet<string> WeaponElements(JsonObject d)
    {
        var e = new HashSet<string>();
        foreach (var f in new[] { "element_type", "element2_type" })
        {
            var v = d[f]?.ToString();
            if (!string.IsNullOrEmpty(v)) e.Add(v);
        }
        var es = d["element"]?.ToString() ?? "";
        if (es.Length > 0)
        {
            var parts = es.Split(' ');
            for (var i = 0; i + 1 < parts.Length; i += 2) e.Add(parts[i]);
        }
        var sp = d["special"]?.ToString() ?? "";
        if (sp.Length > 0) e.Add(sp.Split(' ')[0]);
        return e.Count > 0 ? e : new HashSet<string> { "Raw" };
    }

    private static bool AmmoMatches(HashSet<string> set, JsonObject? ammo)
    {
        if (ammo is null) return false;
        foreach (var key in set)
        {
            var v = ammo[key];
            if (v is JsonArray arr) { if (arr.Any(x => AsInt(x) > 0)) return true; }
            else if (v is not null && AsInt(v) > 0) return true;
        }
        return false;
    }

    private static int AsInt(JsonNode? n)
    {
        if (n is null) return 0;
        try { return n.GetValue<int>(); } catch { }
        if (n is JsonValue v && v.TryGetValue<string>(out var s) && int.TryParse(s, out var p)) return p;
        return 0;
    }
}
