using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

/// <summary>One way an item/treasure can be obtained from a monster: the Monster (display name) and
/// MonsterId (for deep-linking to its Monsters-tab entry), the Source (method + part, e.g. "Carve · Tail",
/// "Break · Head", "Shiny (Ore)"), the rank tier, and the drop rate. Alt drives row striping; Monster is
/// blanked on consecutive rows so each monster reads as one group (MonsterId is retained).</summary>
public sealed record MonsterSource(string Monster, string MonsterId, string Source, string Rank, string Rate, bool Alt = false);

/// <summary>Reverse index: item/treasure name → the monster carve / shiny / capture / break sources it
/// drops from, with per-rank drop rates. Built once from every monster's loot tables and shared by the
/// Items and Treasures tabs. This is the inverse of the per-monster loot tables shown on the Monster page.</summary>
public static class MonsterSourceIndex
{
    private static Dictionary<string, List<MonsterSource>>? _index;
    private static string Norm(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    /// <summary>The monster sources for a named item/treasure; empty when it has none.</summary>
    public static IReadOnlyList<MonsterSource> For(string name) =>
        (_index ??= Build()).TryGetValue(Norm(name), out var v) ? v : System.Array.Empty<MonsterSource>();

    // Reward tiers (ranks) in the same order/labels the monster pages use, keyed by their JSON field.
    private static readonly (string Key, string Label)[] RewardTiers =
    {
        ("guild_low_12", "Guild 1★~2★"),
        ("elder_guild_low", "Elder/Guild Low"),
        ("nekoht_guild_high", "Nekoht/Guild High"),
        ("g_rank", "G Rank"),
        ("special", "Special"),
        ("treasure_hunt", "Treasure Hunt"),
    };

    // Method sort order for grouping a monster's rows: carves first, then shiny, capture, break.
    private static int MethodOrder(string method) => method switch
    {
        "Carve" => 0, "Shiny" => 1, "Capture" => 2, "Break" => 3, _ => 4,
    };

    // Break/capture reward entries embed the quantity in the name, e.g. "Akantor Claw (2)" = 2×.
    private static readonly Regex QtySuffix = new(@"^(.*?)\s*\((\d+)\)\s*$", RegexOptions.Compiled);
    private static (string Name, int Qty) SplitQty(string s)
    {
        var m = QtySuffix.Match(s);
        return m.Success ? (m.Groups[1].Value, int.Parse(m.Groups[2].Value)) : (s, 1);
    }

    // "Carve · Body", "Break · Head", "Capture", "Shiny (Ore)", with a "×N" suffix when qty > 1.
    private static string BuildSourceLabel(string method, string part, int qty)
    {
        string s = method switch
        {
            "Shiny" => string.IsNullOrEmpty(part) ? "Shiny" : part,   // part already reads "Shiny…"
            "Capture" => "Capture",
            _ => string.IsNullOrEmpty(part) ? method : $"{method} · {part}",
        };
        return qty > 1 ? $"{s}  ×{qty}" : s;
    }

    // Scan every monster's carve / shiny / capture / break tables once, mapping each item to the
    // (monster, method+part, rank, rate) rows it can be obtained from — the reverse of the monster pages.
    private static Dictionary<string, List<MonsterSource>> Build()
    {
        // item norm → raw rows before grouping/striping.
        var tmp = new Dictionary<string,
            List<(string Monster, string MonsterId, int MethodOrd, string Source, int RankOrd, string Rank, int Pct)>>();

        void Add(string item, string monster, string monsterId, string method, string part, int qty, int rankOrd, string rank, int pct)
        {
            var source = BuildSourceLabel(method, part, qty);
            var k = Norm(item);
            if (!tmp.TryGetValue(k, out var rows)) { rows = new(); tmp[k] = rows; }
            rows.Add((monster, monsterId, MethodOrder(method), source, rankOrd, rank, pct));
        }

        void Scan(JsonObject part, string monster, string monsterId, string method, string partLabel)
        {
            for (var ri = 0; ri < RewardTiers.Length; ri++)
                if (part[RewardTiers[ri].Key] is JsonArray entries)
                    foreach (var e in entries.OfType<JsonObject>())
                    {
                        if (e["item"]?.ToString() is not { Length: > 0 } raw) continue;
                        var (name, qty) = SplitQty(raw);
                        var pct = e["pct"] is JsonNode p && int.TryParse(p.ToString(), out var pv) ? pv : 0;
                        Add(name, monster, monsterId, method, partLabel, qty, ri, RewardTiers[ri].Label, pct);
                    }
        }

        foreach (var mon in AppDb.Instance.GetMonsters())
        {
            if (AppDb.Instance.GetMonsterDoc(mon.Id) is not { } doc) continue;

            if (doc["carve"] is JsonArray carve)
                foreach (var part in carve.OfType<JsonObject>())
                {
                    var label = part["label"]?.ToString() ?? "";
                    Scan(part, mon.Name, mon.Id, label.StartsWith("Shiny", StringComparison.Ordinal) ? "Shiny" : "Carve", label);
                }

            if (doc["capture"] is JsonObject cap)
                Scan(cap, mon.Name, mon.Id, "Capture", "");

            if (doc["break"] is JsonArray brk)
                foreach (var part in brk.OfType<JsonObject>())
                    Scan(part, mon.Name, mon.Id, "Break", part["label"]?.ToString() ?? "");
        }

        var index = new Dictionary<string, List<MonsterSource>>();
        foreach (var (k, rows) in tmp)
        {
            var sorted = rows
                .GroupBy(r => (r.Monster, r.Source, r.Rank))           // collapse identical rows
                .Select(g => g.First())
                .OrderBy(r => r.Monster).ThenBy(r => r.MethodOrd).ThenBy(r => r.Source).ThenBy(r => r.RankOrd)
                .ToList();
            var outp = new List<MonsterSource>();
            string? prevMon = null;
            for (var i = 0; i < sorted.Count; i++)
            {
                var r = sorted[i];
                outp.Add(new MonsterSource(r.Monster == prevMon ? "" : r.Monster, r.MonsterId, r.Source, r.Rank, $"{r.Pct}%", i % 2 == 1));
                prevMon = r.Monster;
            }
            index[k] = outp;
        }
        return index;
    }
}
