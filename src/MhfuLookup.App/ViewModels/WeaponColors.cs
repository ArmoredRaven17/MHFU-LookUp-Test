using System.Text.Json.Nodes;
using MhfuLookup.Core.Data;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

/// <summary>
/// Element → tree-name colour, ported from the Python weapon_detail tree colour
/// functions (melee single/dual-gradient, GL/Lance, Bow; bowguns uncoloured).
/// </summary>
public static class WeaponColors
{
    private const string DefBonus = "#E87820";

    private static readonly Dictionary<string, string> Element = new()
    {
        ["Fir"] = "#FF4D2E", ["Wtr"] = "#4A9EFF", ["Thn"] = "#F5C400", ["Ice"] = "#7FD8F0",
        ["Drg"] = "#B060E0", ["Poi"] = "#C040C8", ["Par"] = "#D4960A", ["Slp"] = "#B0CCE8",
        ["Sle"] = "#B0CCE8",
    };

    // Bows are raw or elemental only — coating boosts (PoisonC/ParaC/SleepC) are not a status
    // attribute, so those bows keep the default (raw) colour rather than a status tint.
    private static readonly Dictionary<string, string> Bow = new()
    {
        ["Fir"] = "#FF4D2E", ["Wtr"] = "#4A9EFF", ["Thn"] = "#F5C400", ["Ice"] = "#7FD8F0",
        ["Drg"] = "#B060E0", ["Def"] = "#E87820",
    };

    private static readonly HashSet<string> Melee = new()
        { "Great Sword", "Long Sword", "Sword & Shield", "Dual Blades", "Hammer", "Hunting Horn" };

    public static Brush DefaultBrush =>
        (Application.Current.Resources["TextBrush"] as Brush) ?? new SolidColorBrush(Hex("#D4D4D4"));

    public static readonly Brush ExternalBrush = new SolidColorBrush(Hex("#555555"));
    // Navigable cross-type nodes (clickable links to another weapon type) — dim teal vs the grey non-navigable ones.
    public static readonly Brush NavigableBrush = new SolidColorBrush(Hex("#5588AA"));

    public static Brush For(WeaponRow w, string type)
    {
        string? c1 = null, c2 = null;
        if (type == "Bow") c1 = BowColor(w.Doc);
        else if (type is "Gunlance" or "Lance") c1 = GlColor(w.Doc);
        else if (Melee.Contains(type)) (c1, c2) = MeleeColor(w.Doc);
        // bowguns: uncoloured

        if (c1 is not null && c2 is not null) return Gradient(c1, c2);
        if (c1 is not null) return new SolidColorBrush(Hex(c1));
        return DefaultBrush;
    }

    private static string? BowColor(JsonObject d)
    {
        var special = d["special"]?.ToString();
        if (string.IsNullOrEmpty(special)) return null;
        var primary = special.Split(" / ")[0].Trim();
        var key = primary.Split(' ')[0];
        return Bow.GetValueOrDefault(key);
    }

    private static string? GlColor(JsonObject d)
    {
        var element = d["element"]?.ToString();
        if (!string.IsNullOrEmpty(element))
            return Element.GetValueOrDefault(element.Split(' ')[0]);
        return d["def_bonus"].AsIntOr0() != 0 ? DefBonus : null;
    }

    private static (string?, string?) MeleeColor(JsonObject d)
    {
        string? elem = d["element_type"]?.ToString();
        string? elem2 = d["element2_type"]?.ToString();
        var elementStr = d["element"]?.ToString();
        if (string.IsNullOrEmpty(elem) && !string.IsNullOrEmpty(elementStr))
            elem = elementStr.Split(' ')[0];
        if (string.IsNullOrEmpty(elem2) && !string.IsNullOrEmpty(elementStr))
        {
            var parts = elementStr.Split(' ');
            if (parts.Length >= 4) elem2 = parts[2];
        }

        var c1 = elem is { Length: > 0 } ? Element.GetValueOrDefault(elem) : null;
        var c2 = elem2 is { Length: > 0 } ? Element.GetValueOrDefault(elem2) : null;

        if (c1 is not null && c2 is not null) return (c1, c2);
        if (c1 is not null) return (c1, null);
        return d["def_bonus"].AsIntOr0() != 0 ? (DefBonus, null) : (null, null);
    }

    private static LinearGradientBrush Gradient(string h1, string h2)
    {
        var b = new LinearGradientBrush { StartPoint = new(0, 0.5), EndPoint = new(1, 0.5) };
        b.GradientStops.Add(new GradientStop { Color = Hex(h1), Offset = 0 });
        b.GradientStops.Add(new GradientStop { Color = Hex(h2), Offset = 1 });
        return b;
    }

    private static Windows.UI.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        return Windows.UI.Color.FromArgb(255,
            Convert.ToByte(hex[..2], 16), Convert.ToByte(hex[2..4], 16), Convert.ToByte(hex[4..], 16));
    }

    private static int AsIntOr0(this JsonNode? n)
    {
        if (n is null) return 0;
        try { return n.GetValue<int>(); } catch { return 0; }
    }
}
