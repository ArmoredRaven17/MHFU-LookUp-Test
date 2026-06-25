using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media.Imaging;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App;

/// <summary>Tree branch-line cell (0=blank, 1=│, 2=├, 3=└) → whether a given line segment shows.
/// ConverterParameter selects the segment: "top" (upper vertical), "bottom" (lower vertical),
/// "horiz" (the elbow arm to the right). Top: │├└; bottom: │├; horiz (arm): ├└.</summary>
public sealed class GuidePartConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var v = value is int i ? i : 0;
        var show = (parameter as string) switch
        {
            "top" => v >= 1,            // │ ├ └ all enter from the top
            "bottom" => v == 1 || v == 2, // │ ├ continue downward (└ stops at centre)
            "horiz" => v >= 2,          // ├ └ have the rightward arm
            _ => false,
        };
        return show ? Visibility.Visible : Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Monster id → its bundled icon (ms-appx:///Assets/Monsters/{id}.png).</summary>
public sealed class MonsterIconConverter : IValueConverter
{
    private static readonly Dictionary<string, BitmapImage> _cache = new();

    public object? Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is not string id || string.IsNullOrEmpty(id)) return null;
        if (_cache.TryGetValue(id, out var img)) return img;
        img = new BitmapImage(new Uri($"ms-appx:///Assets/Monsters/{id}.png"));
        _cache[id] = img;
        return img;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Item icon basename → its bundled icon (ms-appx:///Assets/Items/{name}.png).</summary>
public sealed class ItemIconConverter : IValueConverter
{
    private static readonly Dictionary<string, BitmapImage> _cache = new();

    public object? Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is not string name || string.IsNullOrEmpty(name)) return null;
        if (_cache.TryGetValue(name, out var img)) return img;
        img = new BitmapImage(new Uri($"ms-appx:///Assets/Items/{name}.png"));
        _cache[name] = img;
        return img;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Quest location name → its bundled area icon (ms-appx:///Assets/Locations/{slug}.png),
/// folding variants onto a shared icon (Great/Moat Arena → Arena; Snowy Mountain/Peak → Snowy Mountains).</summary>
public sealed class LocationIconConverter : IValueConverter
{
    private static readonly Dictionary<string, BitmapImage> _cache = new();

    public object? Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is not string name || string.IsNullOrWhiteSpace(name)) return null;
        var slug = LocationKeys.Key(name);
        if (_cache.TryGetValue(slug, out var img)) return img;
        img = new BitmapImage(new Uri($"ms-appx:///Assets/Locations/{slug}.png"));
        _cache[slug] = img;
        return img;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Full ms-appx image URI string → BitmapImage (empty/null → no image).</summary>
public sealed class ImageUriConverter : IValueConverter
{
    private static readonly Dictionary<string, BitmapImage> _cache = new();

    public object? Convert(object value, Type targetType, object parameter, string language)
    {
        if (value is not string uri || string.IsNullOrEmpty(uri)) return null;
        if (_cache.TryGetValue(uri, out var img)) return img;
        img = new BitmapImage(new Uri(uri));
        _cache[uri] = img;
        return img;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>true → the theme's alternating-row brush, false → transparent. Used for zebra-striping
/// list rows so the eye can follow a wide row across columns.</summary>
public sealed class AltRowBrushConverter : IValueConverter
{
    private static readonly Microsoft.UI.Xaml.Media.Brush Transparent =
        new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0));

    public object Convert(object value, Type targetType, object parameter, string language) =>
        value is true ? Microsoft.UI.Xaml.Application.Current.Resources["AltBgBrush"] : Transparent;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>An ItemRow → Visible when that item can be gathered (drives the green gather marker).</summary>
public sealed class GatherableConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language) =>
        value is ItemRow it && ItemsViewModel.IsGatherable(it.Name) ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>true → Visible, anything else (incl. null) → Collapsed.</summary>
public sealed class BoolToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language) =>
        value is true ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        value is Visibility.Visible;
}

/// <summary>non-null → Visible, null → Collapsed.</summary>
public sealed class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language) =>
        value is null ? Visibility.Collapsed : Visibility.Visible;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>null → Visible (used for "nothing selected" placeholders).</summary>
public sealed class NullToVisibleConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language) =>
        value is null ? Visibility.Visible : Visibility.Collapsed;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Empty/whitespace string → Collapsed, otherwise Visible.</summary>
public sealed class StringToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language) =>
        string.IsNullOrWhiteSpace(value as string) ? Visibility.Collapsed : Visibility.Visible;

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Signed integer → "+10" / "-10" / "0".</summary>
public sealed class SignedIntConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var n = value is int i ? i : 0;
        return n > 0 ? $"+{n}" : n.ToString();
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Hitzone value → tiered background brush (matches the Python hitzone table).</summary>
public sealed class HitzoneBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        _ = int.TryParse(value as string, out var v);
        var (r, g, b) = v switch
        {
            >= 66 => (0x2E, 0x5E, 0x2E),   // dark green
            >= 46 => (0x6B, 0x3D, 0x00),   // dark orange
            >= 21 => (0x5A, 0x52, 0x00),   // dark yellow
            _ => (0x38, 0x38, 0x38),       // dark grey
        };
        return new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(255, (byte)r, (byte)g, (byte)b));
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>"#RRGGBB" hex string → SolidColorBrush.</summary>
public sealed class HexToBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var hex = (value as string)?.TrimStart('#') ?? "888888";
        if (hex.Length == 6 &&
            byte.TryParse(hex[..2], System.Globalization.NumberStyles.HexNumber, null, out var r) &&
            byte.TryParse(hex[2..4], System.Globalization.NumberStyles.HexNumber, null, out var g) &&
            byte.TryParse(hex[4..], System.Globalization.NumberStyles.HexNumber, null, out var b))
            return new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(255, r, g, b));
        return new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(255, 136, 136, 136));
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Positive → green, negative → red, zero → default text brush.</summary>
public sealed class SignBrushConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var n = value is int i ? i : 0;
        var key = n > 0 ? "PositiveBrush" : n < 0 ? "NegativeBrush" : "TextBrush";
        return Microsoft.UI.Xaml.Application.Current.Resources[key];
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>A distinct, thematic colour per quest locale (icy snow, green jungle, lava volcano…).
/// Variants of a locale share a hue; unknown names fall back to the default text colour.</summary>
public sealed class LocationBrushConverter : IValueConverter
{
    // Keyed by the canonical icon slug (see LocationKeys.Key). Brightened from each area's icon
    // (Downloads\MHFU Armors\Location Icons); the five locales sharing one generic icon
    // (arena/battleground/castle_schrade/fortress/town) intentionally share a hue.
    private static readonly Dictionary<string, string> Colors = new()
    {
        ["snowy_mountains"] = "#ABC8DB",
        ["jungle"] = "#63DB90", ["old_jungle"] = "#5BDB50",
        ["desert"] = "#DBAF63", ["old_desert"] = "#DBAD63",
        ["swamp"] = "#BC63DB", ["old_swamp"] = "#BD63DB",
        ["volcano"] = "#DB6461", ["old_volcano"] = "#DB6463",
        ["forest_and_hills"] = "#96DB63", ["great_forest"] = "#63DBC1",
        ["tower"] = "#6395DB",
        ["arena"] = "#DB2CC9", ["battleground"] = "#DB2CC9", ["fortress"] = "#DB2CC9",
        ["town"] = "#DB2CC9", ["castle_schrade"] = "#DB2CC9",
    };

    private static readonly Dictionary<string, Microsoft.UI.Xaml.Media.Brush> Cache = new();

    public object Convert(object value, Type targetType, object parameter, string language)
    {
        var key = LocationKeys.Key(value as string ?? "");
        if (!Colors.TryGetValue(key, out var hex))
            return Microsoft.UI.Xaml.Application.Current.Resources["TextBrush"];
        if (!Cache.TryGetValue(key, out var brush))
        {
            brush = new Microsoft.UI.Xaml.Media.SolidColorBrush(Windows.UI.Color.FromArgb(255,
                byte.Parse(hex[1..3], System.Globalization.NumberStyles.HexNumber),
                byte.Parse(hex[3..5], System.Globalization.NumberStyles.HexNumber),
                byte.Parse(hex[5..], System.Globalization.NumberStyles.HexNumber)));
            Cache[key] = brush;
        }
        return brush;
    }

    public object ConvertBack(object value, Type targetType, object parameter, string language) =>
        throw new NotSupportedException();
}

/// <summary>Canonical key/slug for a quest/gathering location, folding variants onto a shared icon:
/// any "Snowy Mountain(s)[ Peak]" → snowy_mountains; any "Tower N" → tower; Great/Moat Arena → arena;
/// otherwise lower-case with "&"→"and" and non-alphanumerics → "_".</summary>
internal static class LocationKeys
{
    public static string Key(string name)
    {
        var t = (name ?? "").Trim();
        if (t.Contains("Snowy Mountain", StringComparison.OrdinalIgnoreCase)) return "snowy_mountains";
        if (t.StartsWith("Tower", StringComparison.OrdinalIgnoreCase)) return "tower";
        if (t.Equals("Great Arena", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("Moat Arena", StringComparison.OrdinalIgnoreCase) ||
            t.Equals("Arena", StringComparison.OrdinalIgnoreCase)) return "arena";
        return System.Text.RegularExpressions.Regex.Replace(
            t.ToLowerInvariant().Replace("&", "and"), "[^a-z0-9]+", "_").Trim('_');
    }
}
