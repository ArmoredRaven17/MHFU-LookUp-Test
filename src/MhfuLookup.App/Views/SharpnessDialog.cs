using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.Views;

/// <summary>
/// Blademaster sharpness reference: the per-colour damage multipliers, extracted from the MHFU ROM
/// damage table (f0076). Raw (physical) and Element each use their own table; Status has no
/// ROM-confirmed sharpness modifier in MHFU, so it is intentionally not listed. Built in code-behind
/// like the other weapon dialogs (Songs / Shot Types / Shells).
/// </summary>
public sealed class SharpnessDialog : ContentDialog
{
    private static Brush App(string key) => (Brush)Application.Current.Resources[key];
    private readonly Brush _text = App("TextBrush");
    private readonly Brush _muted = App("MutedTextBrush");

    // One row per sharpness colour: swatch/name hue, then the Raw and Element damage multipliers.
    // Raw is the ROM 7-value table (Red→Purple); Element is the ROM table with Purple = 1.20.
    private static readonly (string Name, string Hex, string Raw, string Element)[] Rows =
    {
        ("Red",    "#D03030", "×0.50",  "×0.25"),
        ("Orange", "#E08020", "×0.75",  "×0.50"),
        ("Yellow", "#E0C020", "×1.00",  "×0.75"),
        ("Green",  "#40A040", "×1.125", "×1.00"),
        ("Blue",   "#3060C0", "×1.25",  "×1.0625"),
        ("White",  "#E8E8E8", "×1.30",  "×1.125"),
        ("Purple", "#8040C0", "×1.50",  "×1.20"),
    };

    public SharpnessDialog()
    {
        Title = "Sharpness Modifiers";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 760.0;
        // Opaque backdrop (modals sit over the content/art).
        Resources["ContentDialogBackground"] = App("TableBgOpaqueBrush");
        Resources["ContentDialogForeground"] = _text;
        Resources["ContentDialogBorderBrush"] = App("BorderBrush");
        Background = App("TableBgOpaqueBrush");

        var root = new StackPanel { Spacing = 10, MinWidth = 440 };
        root.Children.Add(new TextBlock
        {
            Text = "On blademaster weapons, sharpness scales how much damage lands. Each colour applies a "
                 + "multiplier — separately to Raw (physical) and Element damage — that rises as sharpness "
                 + "improves from Red to Purple. In the damage formula this is applied as:  damage = True Raw "
                 + "× Motion Value × sharpness × (hitzone ÷ 100) × crit.",
            Foreground = _muted, FontSize = 13, TextWrapping = TextWrapping.Wrap,
        });
        root.Children.Add(BuildTable());
        root.Children.Add(new TextBlock
        {
            Text = "Values extracted from the MHFU ROM damage table (f0076).",
            Foreground = _muted, FontSize = 11, TextWrapping = TextWrapping.Wrap, FontStyle = Windows.UI.Text.FontStyle.Italic,
        });

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
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });          // Sharpness (swatch + name)
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });  // Raw
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });  // Element
        for (var r = 0; r <= Rows.Length; r++) g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        // Header row (Raw before Element).
        Cell(g, 0, 0, "Sharpness", _muted, header: true);
        Cell(g, 0, 1, "Raw", _muted, header: true);
        Cell(g, 0, 2, "Element", _muted, header: true);

        // Separator under the header.
        var rule = new Border
        {
            Height = 1, Background = new SolidColorBrush(Windows.UI.Color.FromArgb(40, 0xFF, 0xFF, 0xFF)),
            Margin = new Thickness(0, 2, 0, 2), VerticalAlignment = VerticalAlignment.Bottom,
        };
        Grid.SetRow(rule, 0); Grid.SetColumn(rule, 0); Grid.SetColumnSpan(rule, 3);
        g.Children.Add(rule);

        // One row per sharpness colour.
        for (var i = 0; i < Rows.Length; i++)
        {
            var (name, hex, raw, elem) = Rows[i];
            var hue = new SolidColorBrush(Hex(hex));
            NameCell(g, i + 1, hue, name);
            Cell(g, i + 1, 1, raw, _text, header: false);
            Cell(g, i + 1, 2, elem, _text, header: false);
        }
        return g;
    }

    // Sharpness name cell: a colour swatch + the colour name tinted to match the in-app sharpness bar.
    private static void NameCell(Grid g, int row, Brush hue, string name)
    {
        var panel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8, Padding = new Thickness(6, 3, 6, 3) };
        panel.Children.Add(new Border
        {
            Width = 13, Height = 13, CornerRadius = new CornerRadius(2), Background = hue,
            VerticalAlignment = VerticalAlignment.Center,
        });
        panel.Children.Add(new TextBlock
        {
            Text = name, Foreground = hue, FontSize = 13, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
            VerticalAlignment = VerticalAlignment.Center,
        });
        Grid.SetRow(panel, row);
        Grid.SetColumn(panel, 0);
        g.Children.Add(panel);
    }

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

    private static Windows.UI.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        return Windows.UI.Color.FromArgb(255,
            System.Convert.ToByte(hex[..2], 16), System.Convert.ToByte(hex[2..4], 16), System.Convert.ToByte(hex[4..], 16));
    }
}
