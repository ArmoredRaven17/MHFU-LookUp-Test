using System.Collections.ObjectModel;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using MhfuLookup.Core.Data;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

public sealed partial class WeaponNode : ObservableObject
{
    public WeaponRow? Weapon { get; init; }
    public string Name { get; init; } = "";
    public string IconUri { get; init; } = "";   // rarity-coloured weapon-type icon ("" for external/source rows)
    public Brush Foreground { get; init; } = WeaponColors.DefaultBrush;
    public bool IsExternal { get; init; }
    // Set on navigable external nodes: clicking in the view calls ViewModel.NavigateTo(CrossType, CrossName).
    public string? CrossType { get; init; }
    public string? CrossName { get; init; }
    public Windows.UI.Text.FontStyle FontStyle =>
        IsExternal ? Windows.UI.Text.FontStyle.Italic : Windows.UI.Text.FontStyle.Normal;
    public ObservableCollection<WeaponNode> Children { get; } = new();

    [ObservableProperty] private bool isExpanded = true;   // tree defaults to expanded

    // Branch-line guides: one cell per depth level (0=blank, 1=│, 2=├, 3=└); the last cell is this
    // node's own connector, earlier cells are ancestor continuations. Depth drives the negative
    // gutter margin so the guides overlay the TreeView's per-level indentation. Set by
    // WeaponViewModel once the forest is built.
    public int Depth { get; set; }
    public IReadOnlyList<int> Guides { get; set; } = Array.Empty<int>();
    public Thickness GutterMargin => new(-(Depth * WeaponViewModel.IndentStep), 0, 0, 0);
}

public sealed record SharpSegment(double Width, string Color);
public sealed record StatPair(string Label, string Value)
{
    public Brush ValueBrush { get; init; } = WeaponColors.DefaultBrush;
}
public sealed record ChargeChip(string Text, Brush Color);
// An element/status stat: an element icon (empty for unknown tokens) + value text, tinted.
public sealed record ElementChip(string IconUri, string Text, Brush Color);
public sealed record CoatingChip(string Text, Brush Color, bool Boosted, Brush Background, Windows.UI.Text.FontWeight Weight);
public sealed record AmmoLine(string Name, Brush NameColor, string L1, string L2, string L3);
public sealed record AmmoGroup(string Header, IReadOnlyList<AmmoLine> Lines);

// Hunting Horn: a note-colour icon (ms-appx uri) and one playable song row.
public sealed record NoteIcon(string Uri);

// One crafting-material entry: the full "5 Iron Ore" text and the resolved item-icon basename ("" if none).
public sealed record MaterialItem(string Text, string Icon);
public sealed record SongRow(
    string Title, string EncoreText, bool HasEncore, IReadOnlyList<NoteIcon> Sequence);

public sealed class WeaponDetailView
{
    public string Name { get; init; } = "";
    public string Type { get; init; } = "";
    public string IconUri { get; init; } = "";   // rarity-coloured weapon-type icon
    public string AttackText { get; init; } = "";
    public string RarityText { get; init; } = "";                       // "Rare N"
    public Brush RarityBrush { get; init; } = WeaponColors.DefaultBrush; // rarity-tier colour
    public bool HasRarity => RarityText.Length > 0;
    public string SlotsText { get; init; } = "";
    public string PriceText { get; init; } = "";
    public bool HasPrice => PriceText.Length > 0;
    public IReadOnlyList<StatPair> Stats { get; init; } = Array.Empty<StatPair>();
    public IReadOnlyList<SharpSegment> Sharpness { get; init; } = Array.Empty<SharpSegment>();
    public IReadOnlyList<SharpSegment> SharpnessPlus { get; init; } = Array.Empty<SharpSegment>();
    public IReadOnlyList<ElementChip> Elements { get; init; } = Array.Empty<ElementChip>();
    public IReadOnlyList<ChargeChip> Charges { get; init; } = Array.Empty<ChargeChip>();
    public IReadOnlyList<CoatingChip> Coatings { get; init; } = Array.Empty<CoatingChip>();
    public IReadOnlyList<AmmoGroup> Ammo { get; init; } = Array.Empty<AmmoGroup>();   // bowgun loadout
    public IReadOnlyList<ChargeChip> RapidFire { get; init; } = Array.Empty<ChargeChip>();   // LBG rapid-fire ammo
    public IReadOnlyList<NoteIcon> NoteIcons { get; init; } = Array.Empty<NoteIcon>();   // HH note colours
    public IReadOnlyList<SongRow> Songs { get; init; } = Array.Empty<SongRow>();         // HH playable songs
    public string Materials { get; init; } = "";        // upgrade / primary recipe
    public string CreateMaterials { get; init; } = "";   // materials_alt — "Create (M)"
    public IReadOnlyList<MaterialItem> MaterialItems { get; init; } = Array.Empty<MaterialItem>();
    public IReadOnlyList<MaterialItem> CreateMaterialItems { get; init; } = Array.Empty<MaterialItem>();
    public bool HasElements => Elements.Count > 0;
    public bool HasSharpness => Sharpness.Count > 0;
    public bool HasSharpnessPlus => SharpnessPlus.Count > 0;
    public bool HasCharges => Charges.Count > 0;
    public bool HasCoatings => Coatings.Count > 0;
    public bool HasAmmo => Ammo.Count > 0;
    public bool HasRapidFire => RapidFire.Count > 0;
    public bool HasNoteIcons => NoteIcons.Count > 0;
    public bool HasSongs => Songs.Count > 0;
    public bool HasMaterials => Materials.Length > 0;
    public bool HasCreateMaterials => CreateMaterials.Length > 0;
}

public sealed partial class WeaponViewModel : ObservableObject
{
    private static readonly string[] SharpColors =
        { "#D03030", "#E08020", "#E0C020", "#40A040", "#3060C0", "#E8E8E8", "#8040C0" };

    private static readonly Brush AffinityPositive = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0x5F, 0xB8, 0x5F)); // green
    private static readonly Brush AffinityNegative = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0xC0, 0x70, 0x70)); // red

    private static readonly HashSet<string> MeleeTypes = new()
        { "Great Sword", "Long Sword", "Sword & Shield", "Dual Blades", "Hammer", "Hunting Horn" };

    public ObservableCollection<string> Types { get; } = new();
    public ObservableCollection<WeaponNode> Roots { get; } = new();

    /// <summary>Raised after Roots is rebuilt, so the view can refresh the TreeView nodes.</summary>
    public event Action? TreeRebuilt;

    [ObservableProperty] private string? selectedType;
    [ObservableProperty] private string searchText = "";
    [ObservableProperty] private WeaponDetailView? detail;

    public WeaponFilter Filter { get; private set; } = new();

    public void ApplyFilter(WeaponFilter f)
    {
        Filter = f;
        BuildTree(SearchText);
    }

    private List<WeaponRow> _current = new();

    public WeaponViewModel()
    {
        foreach (var t in AppDb.Instance.GetWeaponTypes()) Types.Add(t);
        SelectedType = Types.FirstOrDefault();
    }

    partial void OnSelectedTypeChanged(string? value)
    {
        _current = value is null ? new() : AppDb.Instance.GetWeaponsByType(value);
        Detail = null;
        BuildTree(SearchText);
    }

    partial void OnSearchTextChanged(string value) => BuildTree(value);

    public void Select(WeaponNode node)
    {
        if (node.Weapon is null) return;       // external / source rows aren't selectable
        Detail = BuildDetail(node.Weapon);
    }

    private string? _pendingNavName;

    /// <summary>
    /// Switch to <paramref name="type"/> and, once the tree rebuilds, scroll to and select <paramref name="name"/>.
    /// If already on that type, fires TreeRebuilt immediately so the view can still act on the pending nav.
    /// </summary>
    public void NavigateTo(string type, string name)
    {
        _pendingNavName = name;
        if (SelectedType == type)
            TreeRebuilt?.Invoke();   // already on correct type — fire so page can consume pending nav
        else
            SelectedType = type;    // triggers OnSelectedTypeChanged → BuildTree → TreeRebuilt
    }

    /// <summary>Return and clear the pending cross-type navigation target (called by the view after RebuildNodes).</summary>
    public string? ConsumePendingNav()
    {
        var v = _pendingNavName;
        _pendingNavName = null;
        return v;
    }

    /// <summary>Find a weapon by pk within the current type's loaded list (bookmark deep-linking).</summary>
    public WeaponRow? FindInCurrent(long pk) => _current.FirstOrDefault(w => w.WeaponPk == pk);

    /// <summary>Show a weapon's detail directly (used when deep-linking to a bookmarked weapon).</summary>
    public void SelectByRow(WeaponRow w) => Detail = BuildDetail(w);

    /// <summary>The rarity-coloured weapon-type icon for a weapon row.</summary>
    private static string NodeIcon(WeaponRow w) => WeaponTypeIcons.ForRarity(w.Type, w.Doc["rarity"].AsIntOrZero());

    private void BuildTree(string query)
    {
        Roots.Clear();
        var type = SelectedType ?? "";

        bool flat = !string.IsNullOrWhiteSpace(query) || Filter.IsActive;
        if (flat)
        {
            bool NameOk(WeaponRow w) =>
                string.IsNullOrWhiteSpace(query) || w.Name.Contains(query, StringComparison.OrdinalIgnoreCase);
            foreach (var w in _current.Where(w => NameOk(w) && Filter.Matches(w, type)))
                Roots.Add(new WeaponNode { Weapon = w, Name = w.Name, IconUri = NodeIcon(w), Foreground = WeaponColors.For(w, type) });
            TreeRebuilt?.Invoke();
            return;
        }

        var idToFirstPk = new Dictionary<string, long>();
        foreach (var w in _current) idToFirstPk.TryAdd(w.Id, w.WeaponPk);

        var childrenByParent = new Dictionary<long, List<WeaponRow>>();
        var roots = new List<WeaponRow>();
        foreach (var w in _current)
        {
            long? parentPk = null;
            if (!string.IsNullOrEmpty(w.UpgradesFrom)
                && idToFirstPk.TryGetValue(w.UpgradesFrom, out var pk) && pk != w.WeaponPk)
                parentPk = pk;

            if (parentPk is null) roots.Add(w);
            else
            {
                if (!childrenByParent.TryGetValue(parentPk.Value, out var lst)) { lst = new(); childrenByParent[parentPk.Value] = lst; }
                lst.Add(w);
            }
        }

        var visited = new HashSet<long>();
        WeaponNode Build(WeaponRow w)
        {
            var node = new WeaponNode { Weapon = w, Name = w.Name, IconUri = NodeIcon(w), Foreground = WeaponColors.For(w, type) };
            if (!visited.Add(w.WeaponPk)) return node;
            if (childrenByParent.TryGetValue(w.WeaponPk, out var kids))
                foreach (var c in kids) node.Children.Add(Build(c));
            // External upgrades (other weapon types this can be forged into) — grey italic leaves.
            if (w.Doc["external_upgrades"] is JsonArray exts)
                foreach (var ext in exts.OfType<JsonObject>())
                    node.Children.Add(new WeaponNode
                    {
                        Name = $"{ext["name"]} ({ext["type"]})",
                        IsExternal = true,
                        Foreground = WeaponColors.NavigableBrush,
                        CrossType = ext["type"]?.ToString(),
                        CrossName = ext["name"]?.ToString(),
                    });
            return node;
        }
        // Cross-type forges: if a root here was forged from another weapon type (e.g. an LS that
        // comes from a Great Sword), nest it under a grey italic pseudo-parent naming that origin.
        var incoming = Incoming();
        foreach (var r in roots)
        {
            var node = Build(r);
            if (incoming.TryGetValue(CrossKey(type, r.Name), out var sources))
            {
                var navigable = sources.Count == 1;
                var origin = new WeaponNode
                {
                    Name = string.Join(", ", sources.Select(s => $"{s.Name} ({s.Type})")),
                    IsExternal = true,
                    Foreground = navigable ? WeaponColors.NavigableBrush : WeaponColors.ExternalBrush,
                    CrossType = navigable ? sources[0].Type : null,
                    CrossName = navigable ? sources[0].Name : null,
                };
                origin.Children.Add(node);
                Roots.Add(origin);
            }
            else Roots.Add(node);
        }
        foreach (var root in Roots) AssignGuides(root, new List<int>());
        TreeRebuilt?.Invoke();
    }

    /// <summary>Pixels of indentation the TreeView applies per depth level (matched by the guide cells).</summary>
    public const int IndentStep = 16;

    // Walk the forest assigning each node its depth + branch-line guide cells. `segs` is this node's
    // own guide row (empty for roots); children inherit it with the parent's connector turned into a
    // continuation (├→│, └→blank) and their own ├/└ appended.
    private static void AssignGuides(WeaponNode node, List<int> segs)
    {
        node.Depth = segs.Count;
        node.Guides = segs.ToArray();
        var kids = node.Children;
        if (kids.Count == 0) return;
        var prefix = new List<int>(segs);
        if (prefix.Count > 0) prefix[^1] = prefix[^1] == 2 ? 1 : 0;   // ├→│, └→blank
        for (var i = 0; i < kids.Count; i++)
            AssignGuides(kids[i], new List<int>(prefix) { i == kids.Count - 1 ? 3 : 2 });
    }

    // Cross-type forge origins: (targetType|normName) → the source weapon(s) that forge into it.
    // Built once over all weapons' external_upgrades; powers the pseudo-parent shown in the target's tree.
    private static Dictionary<string, List<(string Name, string Type)>>? _incoming;
    private static string CrossKey(string type, string name) => type + "|" + NormName(name);

    private static Dictionary<string, List<(string Name, string Type)>> Incoming()
    {
        if (_incoming is not null) return _incoming;
        var map = new Dictionary<string, List<(string Name, string Type)>>();
        foreach (var t in AppDb.Instance.GetWeaponTypes())
            foreach (var w in AppDb.Instance.GetWeaponsByType(t))
                if (w.Doc["external_upgrades"] is JsonArray exts)
                    foreach (var e in exts.OfType<JsonObject>())
                    {
                        var tn = e["name"]?.ToString();
                        var tt = e["type"]?.ToString();
                        if (string.IsNullOrEmpty(tn) || string.IsNullOrEmpty(tt)) continue;
                        var key = CrossKey(tt, tn);
                        if (!map.TryGetValue(key, out var lst)) { lst = new(); map[key] = lst; }
                        lst.Add((w.Name, w.Type));
                    }
        _incoming = map;
        return map;
    }

    private static string S(JsonNode? n) => n is null ? "" : n.ToString();

    private static List<SharpSegment> ReadSharpness(JsonNode? n)
    {
        var outp = new List<SharpSegment>();
        if (n is not JsonArray a) return outp;
        for (var i = 0; i < a.Count && i < SharpColors.Length; i++)
        {
            var v = a[i].AsIntOrZero();
            if (v > 0) outp.Add(new SharpSegment(v * 2.0, SharpColors[i]));
        }
        return outp;
    }

    // Bow shot types as colour chips: Rapid=blue, Scatter=green, Pierce=red.
    // The colour channel scales with level — level 1 dark, level 5 full (255).
    private static List<ChargeChip> ReadCharges(JsonNode? n)
    {
        var outp = new List<ChargeChip>();
        if (n is not JsonArray a) return outp;
        foreach (var entry in a)
        {
            var text = entry?.ToString() ?? "";
            if (text.Length == 0) continue;
            var parts = text.Split(' ');
            var type = parts[0];
            var level = parts.Length > 1 && int.TryParse(parts[1], out var lv) ? lv : 0;
            outp.Add(new ChargeChip(text, ChargeBrush(type, level)));
        }
        return outp;
    }

    private static Brush ChargeBrush(string type, int level)
    {
        // Saturation scales with level toward the hue, capped well below pure for readability.
        // Level 5 was still too harsh, so it now lands at the previous level-4 saturation. A
        // paler-than-level-1 bottom step would wash the hue out to near-white, so level 1 keeps
        // the current palest value and levels 1–5 step evenly between 200 and 88.
        const double MaxOff = 88;    // level 5 — most saturated (the previous level 4)
        const double MinOff = 200;   // level 1 — palest, still clearly hue-coded
        var t = (Math.Clamp(level, 1, 5) - 1) / 4.0;     // 0 at L1 … 1 at L5
        var off = (byte)Math.Round(MinOff + (MaxOff - MinOff) * t);
        Windows.UI.Color c = type switch
        {
            "Rapid" => Windows.UI.Color.FromArgb(255, off, off, 255),    // blue
            "Scatter" => Windows.UI.Color.FromArgb(255, off, 255, off),  // green
            "Pierce" => Windows.UI.Color.FromArgb(255, 255, off, off),   // red
            _ => Windows.UI.Color.FromArgb(255, 0xD4, 0xD4, 0xD4),
        };
        return new SolidColorBrush(c);
    }

    // Coatings as colour chips. Tokens: Pwr, Poi, Par, Slp, Pnt, Cls.
    private static readonly Dictionary<string, (string Label, string Hex)> CoatingDefs = new()
    {
        ["Pwr"] = ("Pow", "#FF5252"),   // red
        ["Poi"] = ("Psn", "#B060E0"),   // purple
        ["Par"] = ("Par", "#F5C400"),   // yellow
        ["Slp"] = ("Slp", "#7FD8F0"),   // light blue
        ["Pnt"] = ("Pnt", "#FF7FBF"),   // pink
        ["Cls"] = ("Cls", "#FFFFFF"),   // white
    };

    private static readonly Brush TransparentBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0));

    private static List<CoatingChip> ReadCoatings(JsonNode? n, HashSet<string> boosts)
    {
        var outp = new List<CoatingChip>();
        if (n is not JsonArray a) return outp;
        foreach (var entry in a)
        {
            var token = entry?.ToString() ?? "";
            if (token.Length == 0) continue;
            var (label, hex) = CoatingDefs.TryGetValue(token, out var def) ? def : (token, "#D4D4D4");
            var boosted = boosts.Contains(token);
            // Boosted coatings get a colour-tinted "glow" pill + bold; others are plain.
            Brush bg = boosted ? new SolidColorBrush(Tint(hex, 110)) : TransparentBrush;
            var weight = boosted ? Microsoft.UI.Text.FontWeights.Bold : Microsoft.UI.Text.FontWeights.SemiBold;
            outp.Add(new CoatingChip(label, new SolidColorBrush(Hex(hex)), boosted, bg, weight));
        }
        return outp;
    }

    private static Windows.UI.Color Tint(string hex, byte alpha)
    {
        var c = Hex(hex);
        return Windows.UI.Color.FromArgb(alpha, c.R, c.G, c.B);
    }

    private static Windows.UI.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        return Windows.UI.Color.FromArgb(255,
            Convert.ToByte(hex[..2], 16), Convert.ToByte(hex[2..4], 16), Convert.ToByte(hex[4..], 16));
    }

    // Element / status as colour chips. Elements: Fire=red, Water=blue, Thunder=yellow,
    // Ice=light blue, Dragon=purple. Status reuses the coating colours (Poison=purple,
    // Para=yellow, Sleep=light blue).
    private static readonly Dictionary<string, (string Label, string Hex, string Icon)> ElementDefs = new()
    {
        ["Fir"] = ("Fire", "#FF4D2E", "Fire"),
        ["Wtr"] = ("Water", "#4A9EFF", "Water"),
        ["Thn"] = ("Thunder", "#F5C400", "Thunder"),
        ["Ice"] = ("Ice", "#7FD8F0", "Ice"),
        ["Drg"] = ("Dragon", "#B060E0", "Dragon"),
        ["Poi"] = ("Poison", "#B060E0", "Poison"),
        ["Par"] = ("Para", "#F5C400", "Paralysis"),
        ["Slp"] = ("Sleep", "#7FD8F0", "Sleep"),
        ["Sle"] = ("Sleep", "#7FD8F0", "Sleep"),
    };

    // Bow `special` coating-boost tokens → coating token (emphasised in the Coatings row).
    private static readonly Dictionary<string, string> SpecialCoatingMap = new()
    {
        ["PoisonC"] = "Poi", ["ParaC"] = "Par", ["SleepC"] = "Slp",
        ["PowerC"] = "Pwr", ["PaintC"] = "Pnt", ["CloseC"] = "Cls",
    };

    // Parse element_type / element string / bow `special` into element chips, plus any
    // defense bonus and coating-boost tokens carried in `special`.
    private static (List<ElementChip> Elements, string Defense, HashSet<string> Boosts) ParseElementInfo(JsonObject d)
    {
        var pairs = new List<(string Token, string Value)>();
        var fromSpecial = false;

        if (d["element_type"] is JsonNode et && S(et).Length > 0)
        {
            pairs.Add((S(et), S(d["element_value"])));
            if (d["element2_type"] is JsonNode et2 && S(et2).Length > 0)
                pairs.Add((S(et2), S(d["element2_value"])));
        }
        else if (d["element"] is JsonNode e && S(e).Length > 0)
        {
            var parts = S(e).Split(' ', StringSplitOptions.RemoveEmptyEntries);
            for (var i = 0; i + 1 < parts.Length; i += 2) pairs.Add((parts[i], parts[i + 1]));
        }
        else if (d["special"] is JsonNode sp && S(sp).Length > 0)
        {
            fromSpecial = true;
            foreach (var seg in S(sp).Split('/', StringSplitOptions.RemoveEmptyEntries))
            {
                var t = seg.Trim().Split(' ', 2);
                if (t.Length > 0 && t[0].Length > 0)
                    pairs.Add((t[0], t.Length > 1 ? t[1] : ""));
            }
        }

        var elements = new List<ElementChip>();
        var boosts = new HashSet<string>();
        var defense = "";
        foreach (var (token, value) in pairs)
        {
            if (fromSpecial && token == "Def") { defense = value; continue; }                    // → Defense stat
            if (SpecialCoatingMap.TryGetValue(token, out var coat)) { boosts.Add(coat); continue; } // → coating boost
            var (label, hex, icon) = ElementDefs.TryGetValue(token, out var def) ? def : (token, "#D4D4D4", "");
            // Show the displayed value with its True Value (÷10) in parentheses, e.g. "470 (47)".
            // With an icon the label is redundant; unknown tokens fall back to "Label value" text.
            var shown = WithTrueValue(value);
            var uri = icon.Length > 0 ? $"ms-appx:///Assets/Elements/{icon}.png" : "";
            var text = icon.Length > 0 ? shown : (value.Length > 0 ? $"{label} {shown}" : label);
            elements.Add(new ElementChip(uri, text, new SolidColorBrush(Hex(hex))));
        }
        return (elements, defense, boosts);
    }

    private static string JoinArray(JsonNode? n) =>
        n is JsonArray a ? string.Join(", ", a.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0)) : "";

    // Bowgun ammo loadout. ammo_raw/support hold per-level clip sizes (0 = not loadable);
    // ammo_element/other hold a single clip size. Only loadable ammo is listed.
    private static readonly Dictionary<string, string> AmmoNames = new()
    {
        ["Recov"] = "Recovery", ["Thndr"] = "Thunder", ["Drgon"] = "Dragon", ["Demn"] = "Demon",
    };

    // Ammo name colours, matching the element / status palette used for bow elements & coatings.
    private static readonly Dictionary<string, string> AmmoColors = new()
    {
        ["Flame"] = "#FF4D2E", ["Water"] = "#4A9EFF", ["Thndr"] = "#F5C400", ["Ice"] = "#7FD8F0", ["Drgon"] = "#B060E0",
        ["Poison"] = "#B060E0", ["Para"] = "#F5C400", ["Sleep"] = "#7FD8F0",
        ["Recov"] = "#5FB85F", ["Paint"] = "#FF7FBF",
        ["Tranq"] = "#FF5252",   // red, like the Tranquilizer item
        ["Demn"] = "#FF5252",    // red, like the Demondrug item
        ["Armor"] = "#FFA040",   // orange, like the Armorskin item
        ["Crag"] = "#1FC8B4",    // teal — distinct from the other ammo colours
        ["Clust"] = "#7B68EE",   // indigo — distinct from the other ammo colours
    };

    private static string AmmoLabel(string key) =>
        (AmmoNames.TryGetValue(key, out var nm) ? nm : key) + " S";

    /// <summary>Public accessor for an ammo key's display colour (used by the ammo reference dialog).</summary>
    public static Brush AmmoBrushFor(string key) => AmmoBrush(key);

    private static Brush AmmoBrush(string key) => key switch
    {
        // Softer takes on the bow shot-type colours (Normal=blue, Pellet=green, Pierce=red), toned
        // down from the harsh fully-saturated charge colours so the ammo names aren't glaring.
        "Normal" => new SolidColorBrush(Hex("#6A9CFF")),
        "Pellet" => new SolidColorBrush(Hex("#66CC66")),
        "Pierce" => new SolidColorBrush(Hex("#FF6A6A")),
        _ => AmmoColors.TryGetValue(key, out var hex) ? new SolidColorBrush(Hex(hex)) : WeaponColors.DefaultBrush,
    };

    // Display groups and the ammo (key, data source) in each, in display order. This cuts across
    // the data's ammo_support/ammo_other so status, support and misc ammo land in the right group.
    private static readonly (string Key, string Group, string Source)[] AmmoDefs =
    {
        ("Normal", "Main Ammo", "ammo_raw"), ("Pierce", "Main Ammo", "ammo_raw"), ("Pellet", "Main Ammo", "ammo_raw"),
        ("Crag", "Main Ammo", "ammo_raw"), ("Clust", "Main Ammo", "ammo_raw"),
        ("Poison", "Status", "ammo_support"), ("Para", "Status", "ammo_support"), ("Sleep", "Status", "ammo_support"),
        ("Flame", "Elemental", "ammo_element"), ("Water", "Elemental", "ammo_element"), ("Thndr", "Elemental", "ammo_element"),
        ("Ice", "Elemental", "ammo_element"), ("Drgon", "Elemental", "ammo_element"),
        ("Recov", "Support", "ammo_support"), ("Demn", "Support", "ammo_other"), ("Armor", "Support", "ammo_other"),
        ("Tranq", "Misc", "ammo_other"), ("Paint", "Misc", "ammo_other"),
    };

    private static int SourceLevels(string source) => source switch
    {
        "ammo_raw" => 3,
        "ammo_support" => 2,
        _ => 1,   // ammo_element / ammo_other: single clip size, shown under Lv1
    };

    // LBG rapid-fire ammo names → loadout ammo keys, so each entry can be tinted its ammo colour.
    private static readonly Dictionary<string, string> RapidAmmoKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Normal S"] = "Normal", ["Pierce S"] = "Pierce", ["Flaming S"] = "Flame", ["Pellet S"] = "Pellet",
        ["Water S"] = "Water", ["Thunder S"] = "Thndr", ["Crag S"] = "Crag", ["Freeze S"] = "Ice",
        ["Dragon S"] = "Drgon", ["Recov S"] = "Recov", ["Clust S"] = "Clust", ["Poison S"] = "Poison",
    };

    // "Pierce S Lv1 (5) / Flaming S (3) / …" → one colour-coded chip per ammo.
    private static List<ChargeChip> ReadRapidFire(JsonNode? n)
    {
        var outp = new List<ChargeChip>();
        var text = n is null ? "" : n.ToString();
        foreach (var raw in text.Split('/'))
        {
            var seg = raw.Trim();
            if (seg.Length == 0) continue;
            // Ammo name is the text before " Lv" or " (".
            var cut = seg.IndexOf(" Lv", StringComparison.Ordinal);
            var paren = seg.IndexOf(" (", StringComparison.Ordinal);
            if (cut < 0 || (paren >= 0 && paren < cut)) cut = paren;
            var name = (cut > 0 ? seg[..cut] : seg).Trim();
            var brush = RapidAmmoKeys.TryGetValue(name, out var key) ? AmmoBrush(key) : WeaponColors.DefaultBrush;
            outp.Add(new ChargeChip(seg, brush));
        }
        return outp;
    }

    private static List<AmmoGroup> ReadAmmo(JsonObject d)
    {
        var result = new List<AmmoGroup>();
        string? group = null;
        var lines = new List<AmmoLine>();
        void Flush() { if (lines.Count > 0) result.Add(new AmmoGroup(group!, lines)); }
        foreach (var (key, grp, source) in AmmoDefs)
        {
            if (grp != group) { Flush(); group = grp; lines = new(); }
            var line = ReadAmmoLine(d, key, source);
            if (line is not null) lines.Add(line);
        }
        Flush();
        return result;
    }

    private static AmmoLine? ReadAmmoLine(JsonObject d, string key, string source)
    {
        if (d[source] is not JsonObject obj || !obj.TryGetPropertyValue(key, out var node) || node is null)
            return null;
        var levels = node is JsonArray arr
            ? arr.Select(x => x.AsIntOrZero()).ToList()
            : new List<int> { node.AsIntOrZero() };
        if (levels.All(v => v <= 0)) return null;   // gun can't load this ammo
        var sl = SourceLevels(source);
        // clip size; "—" = level exists but not loadable; "" = this ammo has no such level.
        string Cell(int i) => i < sl && i < levels.Count ? (levels[i] > 0 ? levels[i].ToString() : "—") : "";
        return new AmmoLine(AmmoLabel(key), AmmoBrush(key), Cell(0), Cell(1), Cell(2));
    }

    // Reload speed scale worst → best (slowest → fastest). Faster is better.
    private static readonly string[] ReloadWorstToBest =
        { "Slowest", "SuperSlow", "VerySlow", "Slow", "Normal", "Fast", "VeryFast", "SuperFast", "Fastest" };

    // Recoil scale worst → best (strongest → weakest). Lower recoil is better.
    private static readonly string[] RecoilWorstToBest =
        { "Strong", "Moderate", "Light", "Weak", "VeryWeak", "Weakest" };

    // Smooth red→yellow→green gradient by the value's position in its ordered scale:
    // worst (slow / strong recoil) = red, best (fast / weak recoil) = green.
    private static Brush ScaleBrush(string[] worstToBest, string value)
    {
        var v = value.Replace(" ", "");
        var idx = Array.FindIndex(worstToBest, s => string.Equals(s, v, StringComparison.OrdinalIgnoreCase));
        if (idx < 0) return WeaponColors.DefaultBrush;
        var t = worstToBest.Length <= 1 ? 0.0 : (double)idx / (worstToBest.Length - 1);
        return new SolidColorBrush(FromHsv(120.0 * t, 0.78, 0.92));   // hue 0 = red … 120 = green
    }

    private static Brush ReloadBrush(string value) => ScaleBrush(ReloadWorstToBest, value);
    private static Brush RecoilBrush(string value) => ScaleBrush(RecoilWorstToBest, value);

    // Gunlance shelling colour, matching the Bow shot-type legend (Normal→blue, Long→red,
    // Spread→green) and saturating with the shell level like the Bow charge chips. Value = "Normal 3".
    private static Brush ShellingBrush(string value)
    {
        var parts = value.Split(' ');
        var type = parts.Length > 0 ? parts[0] : "";
        var level = parts.Length > 1 && int.TryParse(parts[1], out var lv) ? lv : 3;
        var t = (Math.Clamp(level, 1, 5) - 1) / 4.0;
        var off = (byte)Math.Round(200 + (88 - 200) * t);   // 200 = palest (Lv1) … 88 = most saturated (Lv5)
        return type switch
        {
            "Normal" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, off, off, 255)),
            "Long" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, 255, off, off)),
            "Spread" => new SolidColorBrush(Windows.UI.Color.FromArgb(255, off, 255, off)),
            _ => WeaponColors.DefaultBrush,
        };
    }

    private static Windows.UI.Color FromHsv(double h, double s, double v)
    {
        h = ((h % 360) + 360) % 360;
        var c = v * s;
        var x = c * (1 - Math.Abs(h / 60.0 % 2 - 1));
        var m = v - c;
        var (r, g, b) = h < 60 ? (c, x, 0.0) : h < 120 ? (x, c, 0.0) : h < 180 ? (0.0, c, x)
                      : h < 240 ? (0.0, x, c) : h < 300 ? (x, 0.0, c) : (c, 0.0, x);
        return Windows.UI.Color.FromArgb(255,
            (byte)Math.Round((r + m) * 255), (byte)Math.Round((g + m) * 255), (byte)Math.Round((b + m) * 255));
    }

    // Hunting Horn note colour letter → bundled icon. Letters: W P B A Y R G.
    private static readonly Dictionary<string, string> NoteColorName = new()
    {
        ["W"] = "white", ["P"] = "purple", ["B"] = "blue", ["A"] = "aqua",
        ["Y"] = "yellow", ["R"] = "red", ["G"] = "green",
    };

    public static string NoteIconUri(string letter) =>
        NoteColorName.TryGetValue(letter, out var c) ? $"ms-appx:///Assets/Notes/Note.{c}.png" : "";

    private static List<NoteIcon> NoteIcons(IEnumerable<string> letters) =>
        letters.Select(n => new NoteIcon(NoteIconUri(n))).ToList();

    // Loaded once; the HH song catalogue + note-set map is small and shared across all horns.
    private static readonly MhfuLookup.Core.Domain.HuntingHornSongs? HhSongs =
        AppDb.Instance.GetHuntingHornSongs();

    /// <summary>The full HH song catalogue, for the reference dialog.</summary>
    public static MhfuLookup.Core.Domain.HuntingHornSongs? SongCatalogue => HhSongs;

    // Crafting-material name → icon basename (exact, then normalised), over items ∪ treasures.
    private static readonly Dictionary<string, string> IconExact = new(StringComparer.OrdinalIgnoreCase);
    private static readonly Dictionary<string, string> IconNorm = new();
    private static string NormName(string s) => Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");

    static WeaponViewModel()
    {
        var named = AppDb.Instance.GetItems().Select(i => (i.Name, i.Icon))
            .Concat(AppDb.Instance.GetTreasures().Select(t => (t.Name, t.Icon)))
            .Where(x => x.Icon.Length > 0);
        foreach (var (name, icon) in named)
        {
            IconExact.TryAdd(name, icon);
            IconNorm.TryAdd(NormName(name), icon);
        }
    }

    // "5 Iron Ore, 1 Machalite Ore, …" → one MaterialItem per entry, each with its resolved icon.
    private static List<MaterialItem> ParseMaterials(string csv)
    {
        var outp = new List<MaterialItem>();
        foreach (var raw in csv.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var text = raw.Trim();
            if (text.Length > 0) outp.Add(new MaterialItem(text, MaterialIcon(text)));
        }
        return outp;
    }

    // A material entry's icon: drop the leading quantity, resolve the name against items
    // (exact, then normalised); a missing ammo level (e.g. Crag S Lv3) falls back to Lv1's icon.
    private static string MaterialIcon(string entry)
    {
        var name = Regex.Replace(entry, @"^\d+\s+", "");
        if (IconExact.TryGetValue(name, out var ic)) return ic;
        if (IconNorm.TryGetValue(NormName(name), out var nic)) return nic;
        var m = Regex.Match(name, @"^(.*) Lv\d+$");
        if (m.Success && IconExact.TryGetValue(m.Groups[1].Value + " Lv1", out var aic)) return aic;
        return "";
    }

    // Rarity-tier colours (matching the blacksmith icon palette). 1–3 share white.
    private static Brush RarityBrush(int r) => new SolidColorBrush(Hex(r switch
    {
        >= 10 => "#AC5CC0",
        9 => "#FFD65A",
        8 => "#FF5A5A",
        7 => "#FF9C5A",
        6 => "#94B5FF",
        5 => "#EF94A5",
        4 => "#73CE8C",
        _ => "#EFEFEF",   // Rare 1–3
    }));

    // Per-class "bloat" multiplier: the displayed Attack is True Raw × this, so True Raw = Attack ÷ this.
    private static readonly Dictionary<string, double> ClassMultiplier = new()
    {
        ["Great Sword"] = 4.8, ["Long Sword"] = 4.8,
        ["Sword & Shield"] = 1.4, ["Dual Blades"] = 1.4,
        ["Hammer"] = 5.2, ["Hunting Horn"] = 5.2,
        ["Lance"] = 2.3, ["Gunlance"] = 2.3,
        ["Heavy Bowgun"] = 1.2, ["Light Bowgun"] = 1.2, ["Bow"] = 1.2,
    };

    /// <summary>"912 (190)" — the displayed Attack with its True Raw (Attack ÷ class multiplier) in parentheses.</summary>
    private static string AttackWithTrueRaw(string type, int atk) =>
        ClassMultiplier.TryGetValue(type, out var m) && m > 0
            ? $"{atk} ({(int)Math.Round(atk / m, MidpointRounding.AwayFromZero)})"
            : atk.ToString();

    /// <summary>Element / status displayed value with its True Value (displayed ÷ 10) in parentheses, e.g. "470 (47)".</summary>
    private static string WithTrueValue(string value) =>
        int.TryParse(value, out var v) && v != 0
            ? $"{value} ({(int)Math.Round(v / 10.0, MidpointRounding.AwayFromZero)})"
            : value;

    private static WeaponDetailView BuildDetail(WeaponRow w)
    {
        var d = w.Doc;
        var isHuntingHorn = w.Type == "Hunting Horn";
        var rarity = d["rarity"].AsIntOrZero();

        var info = ParseElementInfo(d);

        // Defense bonus comes from the def_bonus field (melee/HH) or the bow `special` ("Def +N").
        var defBonus = d["def_bonus"].AsIntOrZero();
        var defenseText = defBonus != 0 ? $"+{defBonus}" : info.Defense;

        // "Other" stats shown after Attack/Element/Slots (Price moves to the bottom).
        var stats = new List<StatPair>();
        if (w.Affinity != 0)
            stats.Add(new StatPair("Affinity", w.Affinity > 0 ? $"+{w.Affinity}%" : $"{w.Affinity}%")
            {
                ValueBrush = w.Affinity > 0 ? AffinityPositive : AffinityNegative,
            });
        if (defenseText.Length > 0) stats.Add(new StatPair("Defense", defenseText));
        if (d["shelling"] is JsonNode sh && S(sh).Length > 0)
            stats.Add(new StatPair("Shelling", S(sh)) { ValueBrush = ShellingBrush(S(sh)) });
        if (d["reload"] is JsonNode rl && S(rl).Length > 0)
            stats.Add(new StatPair("Reload", S(rl)) { ValueBrush = ReloadBrush(S(rl)) });
        if (d["recoil"] is JsonNode rc && S(rc).Length > 0)
            stats.Add(new StatPair("Recoil", S(rc)) { ValueBrush = RecoilBrush(S(rc)) });
        // For Hunting Horns the `notes` array is the three note colours (shown as icons + songs,
        // below); for any other weapon it's plain text notes shown as a stat row.
        if (!isHuntingHorn)
        {
            var notesText = JoinArray(d["notes"]);
            if (notesText.Length > 0) stats.Add(new StatPair("Notes", notesText));
        }

        // Hunting Horn: note-colour icons + the songs this horn can play (from its 3 notes).
        var noteIcons = new List<NoteIcon>();
        var songs = new List<SongRow>();
        if (isHuntingHorn && d["notes"] is JsonArray na)
        {
            var letters = na.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0).ToList();
            noteIcons = NoteIcons(letters);
            if (HhSongs is not null)
            {
                var set = letters.ToHashSet();
                foreach (var s in HhSongs.ForNotes(letters))
                {
                    var encore = s.HasEncore ? $"Encore: {s.EncoreEffect} ({s.EncoreDuration})" : "";
                    songs.Add(new SongRow(
                        $"{s.Name} — {s.Effect} ({s.Duration})", encore, s.HasEncore,
                        NoteIcons(s.PlayableSequence(set))));
                }
            }
        }

        // materials / materials_alt are comma-separated strings, not arrays.
        // `materials` is the upgrade (or primary) recipe; `materials_alt` is the create recipe.
        return new WeaponDetailView
        {
            Name = w.Name,
            Type = w.Type,
            IconUri = WeaponTypeIcons.ForRarity(w.Type, rarity),
            AttackText = AttackWithTrueRaw(w.Type, w.Atk),
            RarityText = rarity > 0 ? $"Rare {rarity}" : "",
            RarityBrush = RarityBrush(rarity),
            SlotsText = SlotDisplay.Bar(w.Slots),
            Stats = stats,
            Sharpness = ReadSharpness(d["sharpness"]),
            SharpnessPlus = ReadSharpness(d["sharpness_plus1"]),
            Elements = info.Elements,
            Charges = ReadCharges(d["charges"]),
            Coatings = ReadCoatings(d["coatings"], info.Boosts),
            Ammo = ReadAmmo(d),
            RapidFire = ReadRapidFire(d["rapid"]),
            NoteIcons = noteIcons,
            Songs = songs,
            Materials = S(d["materials"]),
            CreateMaterials = S(d["materials_alt"]),
            MaterialItems = ParseMaterials(S(d["materials"])),
            CreateMaterialItems = ParseMaterials(S(d["materials_alt"])),
            PriceText = w.Price > 0 ? $"{w.Price}z" : "",
        };
    }
}

file static class JsonIntExt
{
    public static int AsIntOrZero(this JsonNode? n)
    {
        if (n is null) return 0;
        try { return n.GetValue<int>(); } catch { }
        if (n is JsonValue v && v.TryGetValue<string>(out var s) && int.TryParse(s, out var p)) return p;
        return 0;
    }
}
