using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

/// <summary>
/// Bowgun ammo reference: every ammo type, what it does, and its per-level stats (power, hits,
/// element / status, recoil and reload) from the Bowgun Damage Guide. A companion to the Hunting
/// Horn songs and Bow shot-type sheets, opened from the Light/Heavy Bowgun tabs.
/// </summary>
public sealed class BowgunAmmoDialog : ContentDialog
{
    private static Brush App(string key) => (Brush)Application.Current.Resources[key];
    private readonly Brush _text = App("TextBrush");
    private readonly Brush _muted = App("MutedTextBrush");
    private readonly Brush _header = App("HeaderBrush");

    // One ammo level/variant line. Hits is a string so "—" (no-hit support rounds) reads cleanly.
    private readonly record struct Lvl(string Label, int Pwr, string Hits, string Notes, int Recoil, int Reload);

    private readonly record struct Ammo(string Key, string Name, string Desc, Lvl[] Levels, string? Footnote = null);

    private static readonly (string Group, Ammo[] Ammo)[] Catalogue =
    {
        ("Main Ammo", new[]
        {
            new Ammo("Normal", "Normal S", "Standard shot with no special properties; nearly every gun loads it.", new[]
            {
                new Lvl("Lv1", 6, "1", "", 9, 5), new Lvl("Lv2", 12, "1", "", 9, 6), new Lvl("Lv3", 10, "3", "", 9, 7),
            }),
            new Ammo("Pierce", "Pierce S", "Passes through the target, striking several times along its body — best on large, long monsters.", new[]
            {
                new Lvl("Lv1", 10, "3", "", 10, 6), new Lvl("Lv2", 9, "4", "", 10, 7), new Lvl("Lv3", 8, "5", "", 10, 8),
            }),
            new Ammo("Pellet", "Pellet S", "Bursts into a spread of pellets — strong up close on a big hitzone.", new[]
            {
                new Lvl("Lv1", 5, "3", "", 10, 5), new Lvl("Lv2", 5, "4", "", 10, 6), new Lvl("Lv3", 5, "5", "", 11, 7),
            }),
            new Ammo("Crag", "Crag S", "Sticky impact shell that explodes after a delay; deals impact (KO) damage — aim for the head.", new[]
            {
                new Lvl("Lv1", 3, "1", "Fire 30 · Dmg 20", 11, 7), new Lvl("Lv2", 3, "1", "Fire 45 · Dmg 30", 12, 8), new Lvl("Lv3", 3, "1", "Fire 60 · Dmg 40", 13, 9),
            }),
            new Ammo("Clust", "Clust S", "Lobs a shell that scatters into a cluster of bombs over an area. Big damage, awkward to aim.", new[]
            {
                new Lvl("Lv1", 6, "1", "Fire 2 · Dmg 32×3", 13, 8), new Lvl("Lv2", 6, "1", "Fire 2 · Dmg 32×4", 14, 9), new Lvl("Lv3", 6, "1", "Fire 2 · Dmg 32×5", 14, 10),
            }),
        }),
        ("Status", new[]
        {
            new Ammo("Poison", "Poison S", "Builds poison; once it triggers the monster steadily loses health.", new[]
            {
                new Lvl("Lv1", 10, "1", "Poison 25 (28)", 11, 7), new Lvl("Lv2", 15, "1", "Poison 50 (56)", 14, 9),
            }),
            new Ammo("Para", "Para S", "Builds paralysis (the guide labels it “Stun”); pins the monster when it triggers.", new[]
            {
                new Lvl("Lv1", 10, "1", "Para 25 (28)", 11, 7), new Lvl("Lv2", 15, "1", "Para 50 (56)", 14, 9),
            }),
            new Ammo("Sleep", "Sleep S", "Builds sleep; the first big hit on a sleeping monster deals bonus damage.", new[]
            {
                new Lvl("Lv1", 0, "1", "Sleep 25 (28)", 11, 7), new Lvl("Lv2", 0, "1", "Sleep 50 (56)", 14, 9),
            }, "( ) values include Abnormal Status Attack Up (×1.125)."),
        }),
        ("Elemental", new[]
        {
            new Ammo("Flame", "Flaming S", "Fire elemental damage.", new[] { new Lvl("", 7, "1", "Fire — ATP × 0.45", 9, 6) }),
            new Ammo("Water", "Water S", "Water elemental damage.", new[] { new Lvl("", 5, "3", "Water — ATP × 0.15", 9, 6) }),
            new Ammo("Thndr", "Thunder S", "Thunder elemental damage.", new[] { new Lvl("", 5, "3", "Thunder — ATP × 0.15", 9, 6) }),
            new Ammo("Ice", "Freeze S", "Ice elemental damage.", new[] { new Lvl("", 5, "3", "Ice — ATP × 0.15", 9, 6) }),
            new Ammo("Drgon", "Dragon S", "Dragon elemental damage — scarce but potent, especially against elder dragons.", new[] { new Lvl("", 5, "5", "Dragon 64", 13, 9) }),
        }),
        ("Support", new[]
        {
            new Ammo("Recov", "Recovery S", "Heals you and nearby allies.", new[]
            {
                new Lvl("Lv1", 0, "—", "Recovery 30", 10, 7), new Lvl("Lv2", 0, "—", "Recovery 50", 12, 9),
            }),
            new Ammo("Demn", "Demon S", "Hits allies with a Demondrug effect, temporarily raising their attack.", new[] { new Lvl("", 0, "—", "Demondrug", 11, 7) }),
            new Ammo("Armor", "Armor S", "Hits allies with an Armorskin effect, temporarily raising their defense.", new[] { new Lvl("", 0, "—", "Armorskin", 11, 7) }),
        }),
        ("Misc", new[]
        {
            new Ammo("Tranq", "Tranq S", "Tranquilizes a weakened monster — use with a trap to capture it.", new[] { new Lvl("", 0, "1", "Anesthesia 80", 10, 8) }),
            new Ammo("Paint", "Paint S", "Marks the monster on your map, like a Paintball.", new[] { new Lvl("", 0, "1", "Paintball", 11, 7) }),
        }),
    };

    public BowgunAmmoDialog()
    {
        Title = "Bowgun Ammo";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 860.0;
        Resources["ContentDialogBackground"] = App("TableBgOpaqueBrush");
        Resources["ContentDialogForeground"] = _text;
        Resources["ContentDialogBorderBrush"] = App("BorderBrush");
        Background = App("TableBgOpaqueBrush");

        var list = new StackPanel { Spacing = 0, MinWidth = 600 };
        list.Children.Add(new TextBlock
        {
            Text = "Every bowgun ammo type, what it does, and its per-level stats. Which rounds a gun can load — "
                 + "and to what level — is shown in each Light/Heavy Bowgun's own Ammo table.",
            Foreground = _muted, FontSize = 13, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 0, 0, 8),
        });

        var firstGroup = true;
        foreach (var (group, ammos) in Catalogue)
        {
            list.Children.Add(new TextBlock
            {
                Text = group, Foreground = _header, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
                FontSize = 14, Margin = new Thickness(0, firstGroup ? 0 : 12, 0, 4),
            });
            firstGroup = false;
            foreach (var a in ammos) list.Children.Add(Block(a));
        }

        list.Children.Add(new TextBlock
        {
            Text = "Stats from the Bowgun Damage Guide (PSP) by VampireCosmonaut (GameFAQs). Recoil and Reload "
                 + "are the raw scale values (lower is better).",
            Foreground = _muted, FontSize = 11, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 12, 0, 0),
        });

        Content = new ScrollViewer
        {
            Content = list,
            MaxHeight = 680,
            Padding = new Thickness(0, 0, 16, 0),   // room for the scrollbar
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };
    }

    private FrameworkElement Block(Ammo a)
    {
        var panel = new StackPanel { Spacing = 1, Margin = new Thickness(0, 4, 0, 4) };

        panel.Children.Add(new TextBlock
        {
            Text = a.Name, Foreground = WeaponViewModel.AmmoBrushFor(a.Key),
            FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, FontSize = 14,
        });
        panel.Children.Add(new TextBlock { Text = a.Desc, Foreground = _muted, FontSize = 12, TextWrapping = TextWrapping.Wrap });

        foreach (var l in a.Levels)
            panel.Children.Add(new TextBlock
            {
                Text = Line(l), Foreground = _text, FontSize = 13, TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 1, 0, 0),
            });

        if (a.Footnote is { } fn)
            panel.Children.Add(new TextBlock { Text = fn, Foreground = _muted, FontSize = 11, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 1, 0, 0) });

        return panel;
    }

    private static string Line(Lvl l)
    {
        var parts = new List<string>(6);
        if (l.Label.Length > 0) parts.Add(l.Label);
        parts.Add($"Pwr {l.Pwr}");
        parts.Add($"Hits {l.Hits}");
        if (l.Notes.Length > 0) parts.Add(l.Notes);
        parts.Add($"Recoil {l.Recoil}");
        parts.Add($"Reload {l.Reload}");
        return string.Join("   ·   ", parts);
    }
}
