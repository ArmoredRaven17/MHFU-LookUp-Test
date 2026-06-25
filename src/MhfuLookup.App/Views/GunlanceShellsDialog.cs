using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.Views;

/// <summary>
/// Gunlance shell-type reference: the shelling damage + fire component per shell level for Normal,
/// Long, Spread, and Wyvern Fire. Shell types are colour-matched to the weapon's Shelling stat
/// (Normal=blue, Long=red, Spread=green), like the Bow shot-types sheet. Built in code-behind like
/// the other weapon dialogs.
/// </summary>
public sealed class GunlanceShellsDialog : ContentDialog
{
    private static Brush App(string key) => (Brush)Application.Current.Resources[key];
    private readonly Brush _text = App("TextBrush");
    private readonly Brush _muted = App("MutedTextBrush");

    private static SolidColorBrush B(byte r, byte g, byte b) => new(Windows.UI.Color.FromArgb(255, r, g, b));

    // One column per shell type (+ Wyvern Fire), its header colour, and its value at shell levels 1–5.
    private static readonly (string Name, Brush Color, string[] Values)[] Columns =
    {
        ("Normal", B(0x6A, 0x9C, 0xFF),
            new[] { "12% · 4 Fire", "15% · 5 Fire", "18% · 6 Fire", "21% · 8 Fire", "24% · 8 Fire" }),
        ("Long", B(0xFF, 0x6A, 0x6A),
            new[] { "18% · 9 Fire", "22% · 10 Fire", "28% · 14 Fire", "32% · 16 Fire", "36% · 18 Fire" }),
        ("Spread", B(0x66, 0xCC, 0x66),
            new[] { "24% · 6 Fire", "32% · 8 Fire", "40% · 10 Fire", "44% · 11 Fire", "48% · 12 Fire" }),
        ("Wyvern Fire", B(0xFF, 0x9F, 0x4D),
            new[] { "30% · 10 Fire", "36% · 12 Fire", "42% · 14 Fire", "44% · 15 Fire", "48% · 16 Fire" }),
    };

    public GunlanceShellsDialog()
    {
        Title = "Gunlance Shell Types";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 760.0;
        // Opaque backdrop (modals sit over the content/art).
        Resources["ContentDialogBackground"] = App("TableBgOpaqueBrush");
        Resources["ContentDialogForeground"] = _text;
        Resources["ContentDialogBorderBrush"] = App("BorderBrush");
        Background = App("TableBgOpaqueBrush");

        var root = new StackPanel { Spacing = 10, MinWidth = 560 };
        root.Children.Add(new TextBlock
        {
            Text = "A gunlance fires shells whose power scales with its shell type and level (the Shelling stat). "
                 + "Normal, Long, and Spread differ in reach and spread; Wyvern Fire is the gunlance's big forward "
                 + "blast. Each entry is the shell's damage and its fire component, per shell level.",
            Foreground = _muted, FontSize = 13, TextWrapping = TextWrapping.Wrap,
        });
        root.Children.Add(BuildTable());

        Content = new ScrollViewer
        {
            Content = root,
            MaxHeight = 640,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };
    }

    private FrameworkElement BuildTable()
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(80) });   // Shell Lvl
        foreach (var _ in Columns)
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        for (var r = 0; r <= 5; r++) g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        // Header row: "Shell Lvl" + colour-coded shell-type names.
        Cell(g, 0, 0, "Shell Lvl", _muted, header: true);
        for (var c = 0; c < Columns.Length; c++)
            Cell(g, 0, c + 1, Columns[c].Name, Columns[c].Color, header: true);

        // Separator under the header.
        var rule = new Border
        {
            Height = 1, Background = new SolidColorBrush(Windows.UI.Color.FromArgb(40, 0xFF, 0xFF, 0xFF)),
            Margin = new Thickness(0, 2, 0, 2),
        };
        Grid.SetRow(rule, 0); Grid.SetColumn(rule, 0); Grid.SetColumnSpan(rule, Columns.Length + 1);
        rule.VerticalAlignment = VerticalAlignment.Bottom;
        g.Children.Add(rule);

        // Data rows: shell levels 1–5. Each value is tinted by its shell type, and (like the Bow
        // charge colours) saturates as the shell level rises.
        for (var lv = 1; lv <= 5; lv++)
        {
            Cell(g, lv, 0, lv.ToString(), _muted, header: false);
            for (var c = 0; c < Columns.Length; c++)
                Cell(g, lv, c + 1, Columns[c].Values[lv - 1], LevelBrush(Columns[c].Name, lv), header: false);
        }
        return g;
    }

    // Per-level shell colour, mirroring the Bow charge palette: the hue's other channels step from
    // 200 (Lv1, palest) to 88 (Lv5, most saturated). Wyvern Fire (orange) interpolates pale → vivid.
    private static SolidColorBrush LevelBrush(string type, int level)
    {
        var t = (Math.Clamp(level, 1, 5) - 1) / 4.0;          // 0 at Lv1 … 1 at Lv5
        var off = (byte)Math.Round(200 + (88 - 200) * t);
        Windows.UI.Color c = type switch
        {
            "Normal" => Windows.UI.Color.FromArgb(255, off, off, 255),   // blue
            "Long" => Windows.UI.Color.FromArgb(255, 255, off, off),     // red
            "Spread" => Windows.UI.Color.FromArgb(255, off, 255, off),   // green
            "Wyvern Fire" => Lerp(Windows.UI.Color.FromArgb(255, 0xFF, 0xCF, 0xA0),
                                  Windows.UI.Color.FromArgb(255, 0xFF, 0x8A, 0x2E), t),  // pale → vivid orange
            _ => Windows.UI.Color.FromArgb(255, 0xD4, 0xD4, 0xD4),
        };
        return new SolidColorBrush(c);
    }

    private static Windows.UI.Color Lerp(Windows.UI.Color a, Windows.UI.Color b, double t) =>
        Windows.UI.Color.FromArgb(255,
            (byte)Math.Round(a.R + (b.R - a.R) * t),
            (byte)Math.Round(a.G + (b.G - a.G) * t),
            (byte)Math.Round(a.B + (b.B - a.B) * t));

    private static void Cell(Grid g, int row, int col, string text, Brush fg, bool header)
    {
        var tb = new TextBlock
        {
            Text = text, Foreground = fg, FontSize = 13,
            FontWeight = header ? Microsoft.UI.Text.FontWeights.SemiBold : Microsoft.UI.Text.FontWeights.Normal,
            Padding = new Thickness(6, 3, 6, 3),
        };
        Grid.SetRow(tb, row);
        Grid.SetColumn(tb, col);
        g.Children.Add(tb);
    }
}
