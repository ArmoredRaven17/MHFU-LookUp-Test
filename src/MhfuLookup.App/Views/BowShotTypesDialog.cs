using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using MhfuLookup.Core.Domain;

namespace MhfuLookup.App.Views;

/// <summary>
/// Bow shot-type reference: each shot type, how it behaves, and its per-arrow / per-hit power
/// pattern at every shot level. A companion to the Hunting Horn songs and Bowgun ammo sheets,
/// opened from the Bow tab. Self-contained, built in code-behind like the other weapon dialogs.
/// </summary>
public sealed class BowShotTypesDialog : ContentDialog
{
    private static Brush App(string key) => (Brush)Application.Current.Resources[key];
    private readonly Brush _text = App("TextBrush");
    private readonly Brush _muted = App("MutedTextBrush");

    private static Windows.UI.Color Hex(string hex)
    {
        hex = hex.TrimStart('#');
        return Windows.UI.Color.FromArgb(255,
            Convert.ToByte(hex[..2], 16), Convert.ToByte(hex[2..4], 16), Convert.ToByte(hex[4..], 16));
    }

    // Soft shot-type tints, matching the Bow Compare legend (Rapid blue, Scatter green, Pierce red).
    private static Brush ShotBrush(BowShotType t) => new SolidColorBrush(t switch
    {
        BowShotType.Rapid => Hex("#6A9CFF"),
        BowShotType.Scatter => Hex("#66CC66"),
        BowShotType.Pierce => Hex("#FF6A6A"),
        _ => Hex("#D4D4D4"),
    });

    // Per-level shot colour: the hue's other channels step from 200 (Lv1, palest) to 88 (Lv5, most
    // saturated) — the same gradient as the Bow charge chips and the Gunlance shells.
    private static Brush LevelBrush(BowShotType t, int level)
    {
        var k = (Math.Clamp(level, 1, 5) - 1) / 4.0;
        var off = (byte)Math.Round(200 + (88 - 200) * k);
        return new SolidColorBrush(t switch
        {
            BowShotType.Rapid => Windows.UI.Color.FromArgb(255, off, off, 255),
            BowShotType.Scatter => Windows.UI.Color.FromArgb(255, off, 255, off),
            BowShotType.Pierce => Windows.UI.Color.FromArgb(255, 255, off, off),
            _ => Windows.UI.Color.FromArgb(255, 0xD4, 0xD4, 0xD4),
        });
    }

    private static string Behaviour(BowShotType t) => t switch
    {
        BowShotType.Rapid => "Arrows stack on a single spot — every hit lands reliably, so the whole pattern connects.",
        BowShotType.Scatter => "Pellets fan out in a spread — strong up close on a big part, but several often miss a small one.",
        BowShotType.Pierce => "The shot passes through the target, hitting once per tick — best on long, aligned bodies.",
        _ => "",
    };

    public BowShotTypesDialog()
    {
        Title = "Bow Shot Types";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 820.0;
        // Match the app theme; opaque table surface as the backdrop (modals sit over content/art).
        Resources["ContentDialogBackground"] = App("TableBgOpaqueBrush");
        Resources["ContentDialogForeground"] = _text;
        Resources["ContentDialogBorderBrush"] = App("BorderBrush");
        Background = App("TableBgOpaqueBrush");

        var list = new StackPanel { Spacing = 0, MinWidth = 560 };
        list.Children.Add(new TextBlock
        {
            Text = "Each charge level of a bow fires one of these shot types at a level. The pattern is the "
                 + "power of each arrow / hit; Raw damage scales with their sum, while element applies per "
                 + "arrow (every arrow carries the full element). Crit / Feeble is rolled per arrow.",
            Foreground = _muted, FontSize = 13, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8),
        });

        var first = true;
        foreach (var type in new[] { BowShotType.Rapid, BowShotType.Scatter, BowShotType.Pierce })
        {
            if (!first) list.Children.Add(new Border
            {
                Height = 1, Background = new SolidColorBrush(Windows.UI.Color.FromArgb(40, 0xFF, 0xFF, 0xFF)),
                Margin = new Thickness(0, 8, 0, 8),
            });
            first = false;
            list.Children.Add(Section(type));
        }

        Content = new ScrollViewer
        {
            Content = list,
            MaxHeight = 680,
            Padding = new Thickness(0, 0, 16, 0),   // room for the scrollbar
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };
    }

    private FrameworkElement Section(BowShotType type)
    {
        var panel = new StackPanel { Spacing = 2 };

        var head = new TextBlock { TextWrapping = TextWrapping.Wrap, FontSize = 14 };
        head.Inlines.Add(new Run
        {
            Text = type.ToString(), Foreground = ShotBrush(type),
            FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
        });
        head.Inlines.Add(new Run { Text = $" — {Behaviour(type)}", Foreground = _muted });
        panel.Children.Add(head);

        // Header row: Level | Pattern (per-arrow power) | Hits
        panel.Children.Add(Row("Level", "Pattern", "Hits", _muted, true));
        for (var lv = 1; lv <= 5; lv++)
        {
            var arrows = BowDamage.ArrowPowers(type, lv);
            panel.Children.Add(Row($"Lv {lv}", string.Join("-", arrows),
                $"{arrows.Count}", LevelBrush(type, lv), false));
        }
        return panel;
    }

    private static FrameworkElement Row(string lvl, string pattern, string hits, Brush fg, bool header)
    {
        var g = new Grid { Margin = new Thickness(0, 1, 0, 1) };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(64) });    // Level
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });   // Pattern (fixed → Hits lines up across rows)
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });        // Hits
        var weight = header ? Microsoft.UI.Text.FontWeights.SemiBold : Microsoft.UI.Text.FontWeights.Normal;

        void Cell(int col, string text, double leftMargin, bool wrap)
        {
            var tb = new TextBlock
            {
                Text = text, Foreground = fg, FontSize = 13, FontWeight = weight,
                Margin = new Thickness(leftMargin, 0, 0, 0),
            };
            if (wrap) tb.TextWrapping = TextWrapping.Wrap;   // safety for an unusually long pattern
            Grid.SetColumn(tb, col);
            g.Children.Add(tb);
        }
        Cell(0, lvl, 0, false);
        Cell(1, pattern, 0, true);
        Cell(2, hits, 12, false);
        return g;
    }
}
