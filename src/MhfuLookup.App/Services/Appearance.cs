using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.Services;

/// <summary>
/// User-customisable appearance: the window/taskbar icon (a monster, default Question Mark) and a
/// basic app colour theme. Both persist to the settings table and apply live.
/// </summary>
public static class Appearance
{
    // ── Window / taskbar icon ── (monster id; "_unknown" is the Question Mark fallback)
    public const string DefaultIcon = "nargacuga";
    private static string? _icon;
    public static event Action? IconChanged;

    public static string IconId
    {
        get => _icon ??= AppDb.Instance.GetSetting("app_icon") ?? DefaultIcon;
        set
        {
            if (value == IconId) return;
            _icon = value;
            AppDb.Instance.SetSetting("app_icon", value);
            IconChanged?.Invoke();
        }
    }

    // ── Theme colour ──
    public const string DefaultColor = "charcoal";
    private static string? _color;
    public static event Action? ColorChanged;

    public static string ColorId
    {
        get => _color ??= AppDb.Instance.GetSetting("theme_color") ?? DefaultColor;
        set
        {
            if (value == ColorId) return;
            _color = value;
            AppDb.Instance.SetSetting("theme_color", value);
            ApplyColor(value);
            ColorChanged?.Invoke();
        }
    }

    /// <summary>Current window background colour (for the title bar).</summary>
    public static Windows.UI.Color WindowColor { get; private set; } = Hex("#1E1E1E");

    /// <summary>Window/Base/Alt/Panel/Border are dark tints; Swatch is a vivid hue for the picker.</summary>
    public sealed record ColorPreset(
        string Key, string Name, string Window, string Base, string Alt, string Panel, string Border, string Swatch);

    public static readonly IReadOnlyList<ColorPreset> Presets = new[]
    {
        // Organised by hue, with every entry kept visually distinct from its neighbours.
        // Neutrals (light -> dark)
        new ColorPreset("silver",    "Silver",    "#1E1E1F", "#272728", "#2E2F2F", "#232324", "#444546", "#BFC3C7"),
        new ColorPreset("sand",      "Sand",      "#1F1D19", "#282621", "#2F2D27", "#24221E", "#464237", "#C2B48C"),
        new ColorPreset("fog",       "Fog",       "#1D1E1F", "#262728", "#2D2E2F", "#222324", "#434446", "#A8AEB4"),
        new ColorPreset("taupe",     "Taupe",     "#1F1D1B", "#282523", "#2F2D2A", "#242220", "#46413C", "#9A8C7C"),
        new ColorPreset("steel",     "Steel",     "#1A1E22", "#22272C", "#282E34", "#20242A", "#3A434C", "#6E8090"),
        new ColorPreset("mocha",     "Mocha",     "#221C18", "#2D251F", "#342B25", "#28211C", "#4B3F36", "#8C7361"),
        new ColorPreset("slate",     "Slate",     "#1B1E24", "#232830", "#2A303A", "#21262E", "#3A4250", "#5A6B80"),
        new ColorPreset("charcoal",  "Charcoal",  "#161616", "#1E1E1E", "#222222", "#1B1B1B", "#333333", "#5A5A5A"),
        // Reds
        new ColorPreset("red",       "Red",       "#241616", "#2C1C1C", "#341F1F", "#2A1919", "#4A3030", "#C04040"),
        new ColorPreset("scarlet",   "Scarlet",   "#221513", "#2D1B18", "#341F1C", "#281816", "#4B302C", "#E0402A"),
        new ColorPreset("salmon",    "Salmon",    "#221A18", "#2D221F", "#342825", "#281E1C", "#4B3B36", "#E8917A"),
        new ColorPreset("coral",     "Coral",     "#261812", "#2E1F18", "#35251C", "#2B1C16", "#4C3A2E", "#E07050"),
        // Oranges & browns
        new ColorPreset("rust",      "Rust",      "#221814", "#2D201A", "#34251E", "#281C17", "#4B372E", "#B0542C"),
        new ColorPreset("brown",     "Brown",     "#211913", "#292019", "#30261D", "#261D16", "#463829", "#9C6B40"),
        new ColorPreset("orange",    "Orange",    "#241C12", "#2D2318", "#34291C", "#2A2016", "#4A3A24", "#C0772E"),
        new ColorPreset("amber",     "Amber",     "#241E10", "#2D2616", "#342C1A", "#2A2414", "#4C4024", "#D8A028"),
        // Yellows & golds
        new ColorPreset("gold",      "Gold",      "#24200E", "#2E2913", "#352F18", "#2A2512", "#4E4320", "#E6B41E"),
        new ColorPreset("yellow",    "Yellow",    "#23220E", "#2C2B14", "#333219", "#292813", "#4A4824", "#ECD92E"),
        new ColorPreset("butter",    "Butter",    "#211F14", "#2A2719", "#31301F", "#262319", "#47432E", "#ECDD8E"),
        // Greens
        new ColorPreset("chartreuse","Chartreuse","#202214", "#2A2D1A", "#31341F", "#252817", "#474B2F", "#C2D838"),
        new ColorPreset("olive",     "Olive",     "#1E2112", "#262A18", "#2C311C", "#232717", "#404826", "#8FA83C"),
        new ColorPreset("lime",      "Lime",      "#1C2210", "#232C16", "#29331B", "#202915", "#3E4A24", "#9FCC30"),
        new ColorPreset("sage",      "Sage",      "#1C2218", "#242D1F", "#2A3425", "#20281C", "#3D4B36", "#88A878"),
        new ColorPreset("green",     "Green",     "#15211A", "#1C2A22", "#213128", "#1A271F", "#2E4438", "#3FA85A"),
        new ColorPreset("mint",      "Mint",      "#122520", "#182E28", "#1D352F", "#162A24", "#2C4A40", "#44C88A"),
        // Teals & cyans
        new ColorPreset("teal",      "Teal",      "#122321", "#192C2A", "#1F3431", "#172927", "#2C4744", "#2FBFB0"),
        new ColorPreset("cyan",      "Cyan",      "#10232A", "#172C34", "#1B333C", "#152930", "#2A4750", "#2EB8C8"),
        // Blues
        new ColorPreset("sky",       "Sky",       "#14202C", "#1B2935", "#20303E", "#192530", "#2E4055", "#4AA8E0"),
        new ColorPreset("blue",      "Blue",      "#151B2A", "#1C2335", "#20283D", "#1A2030", "#2E3A55", "#4A7FE0"),
        new ColorPreset("navy",      "Navy",      "#121726", "#182038", "#1C2542", "#161D32", "#28345A", "#3A5FC0"),
        new ColorPreset("cobalt",    "Cobalt",    "#141722", "#1A1E2D", "#1F2334", "#171B28", "#2F354B", "#3A5CDC"),
        new ColorPreset("periwinkle","Periwinkle","#181A22", "#1F212D", "#252734", "#1C1D28", "#363A4B", "#8494EC"),
        new ColorPreset("indigo",    "Indigo",    "#1A1630", "#221C3C", "#272147", "#1E1936", "#3A3160", "#6A5ACD"),
        // Purples & violets
        new ColorPreset("lavender",  "Lavender",  "#201A30", "#28203C", "#2E2647", "#251D36", "#423A60", "#9A86E0"),
        new ColorPreset("purple",    "Purple",    "#221630", "#2A1C3C", "#312147", "#271936", "#443060", "#9050C0"),
        new ColorPreset("magenta",   "Magenta",   "#261430", "#2E1A3C", "#351F47", "#2B1736", "#4A3060", "#B040C0"),
        // Pinks & magentas
        new ColorPreset("plum",      "Plum",      "#24142A", "#2C1A34", "#33203E", "#29172F", "#463058", "#A03C90"),
        new ColorPreset("fuchsia",   "Fuchsia",   "#22151F", "#2D1B28", "#34202F", "#281823", "#4B3044", "#D040A8"),
        new ColorPreset("raspberry", "Raspberry", "#22131A", "#2D1922", "#341E28", "#28161E", "#4B2D3B", "#C42C70"),
        new ColorPreset("rose",      "Rose",      "#261620", "#2E1C28", "#36212F", "#2B1926", "#4E3045", "#E06A9A"),
        new ColorPreset("ruby",      "Ruby",      "#221117", "#2D171E", "#341B23", "#28141A", "#4B2934", "#C81850"),
        new ColorPreset("maroon",    "Maroon",    "#28121A", "#301820", "#381E27", "#2D151D", "#4E2C3A", "#9C2848"),
        new ColorPreset("crimson",   "Crimson",   "#260F15", "#2E151C", "#361A22", "#2B1218", "#50303C", "#C03052"),
    };

    // Surface fill opacity over the menu-art background — the theme colour is a translucent tint, so
    // the art shows through clearly while the (dark) theme colour keeps text readable. Lower = more
    // image / more transparent; higher = more solid theme. Borders stay fully opaque.
    private const byte SurfaceAlpha = 0x99;   // ~60%

    /// <summary>Recolour the shared background brushes (live) and remember the window colour.</summary>
    public static void ApplyColor(string key)
    {
        var p = Presets.FirstOrDefault(c => c.Key == key) ?? Presets[0];
        SetBrushC("WindowBgBrush", HexA(p.Window, SurfaceAlpha));
        SetBrushC("BaseBgBrush", HexA(p.Base, SurfaceAlpha));
        SetBrushC("AltBgBrush", HexA(p.Alt, SurfaceAlpha));
        SetBrushC("PanelBgBrush", HexA(p.Panel, SurfaceAlpha));
        SetBrush("BorderBrush", p.Border);
        // Table/detail surface: a darker shade of the window colour so colour-coded text stays
        // readable on any theme (including the lighter, saturated hues).
        SetBrushC("TableBgBrush", WithAlpha(Darken(p.Window, 0.62), SurfaceAlpha));
        // Opaque copies for pop-ups (combo drop-downs, flyouts, dialogs) — same colours, full alpha.
        SetBrush("BaseBgOpaqueBrush", p.Base);
        SetBrush("AltBgOpaqueBrush", p.Alt);
        SetBrush("PanelBgOpaqueBrush", p.Panel);
        SetBrushC("TableBgOpaqueBrush", Darken(p.Window, 0.62));
        WindowColor = Hex(p.Window);
    }

    private static void SetBrush(string key, string hex)
    {
        if (Application.Current.Resources.TryGetValue(key, out var o) && o is SolidColorBrush b)
            b.Color = Hex(hex);
    }

    private static void SetBrushC(string key, Windows.UI.Color c)
    {
        if (Application.Current.Resources.TryGetValue(key, out var o) && o is SolidColorBrush b)
            b.Color = c;
    }

    private static Windows.UI.Color Darken(string hex, double f)
    {
        var c = Hex(hex);
        return Windows.UI.Color.FromArgb(255, (byte)(c.R * f), (byte)(c.G * f), (byte)(c.B * f));
    }

    public static Windows.UI.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        return Windows.UI.Color.FromArgb(255,
            Convert.ToByte(hex[..2], 16), Convert.ToByte(hex[2..4], 16), Convert.ToByte(hex[4..], 16));
    }

    private static Windows.UI.Color HexA(string hex, byte alpha) => WithAlpha(Hex(hex), alpha);

    private static Windows.UI.Color WithAlpha(Windows.UI.Color c, byte alpha) =>
        Windows.UI.Color.FromArgb(alpha, c.R, c.G, c.B);
}
