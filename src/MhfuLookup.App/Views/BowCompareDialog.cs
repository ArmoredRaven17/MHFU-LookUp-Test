using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using MhfuLookup.Core.Data;
using MhfuLookup.Core.Domain;

namespace MhfuLookup.App.Views;

/// <summary>
/// Side-by-side bow comparison modal. Shows neutral-index Raw and Element damage at every
/// charge level for two chosen bows, with an optional Power Coating (×1.5 raw) toggle.
/// Self-contained: launched from the Weapon page, touches no existing view/VM.
/// </summary>
public sealed class BowCompareDialog : ContentDialog
{
    private readonly IReadOnlyList<WeaponRow> _bows;
    private readonly ComboBox _pickA;
    private readonly ComboBox _pickB;
    private readonly ToggleSwitch _power;
    private readonly StackPanel _colA = new() { Spacing = 2 };
    private readonly StackPanel _colB = new() { Spacing = 2 };

    // Simulate ("felt burst") controls — fire a burst at a chosen charge level per bow.
    private const int DefaultBurstShots = 20;
    private readonly NumberBox _shotCount = new()
    {
        Minimum = 1, Maximum = 500, SmallChange = 5, LargeChange = 20, Value = DefaultBurstShots,
        SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Inline, MinWidth = 120,
    };
    private readonly ComboBox _simChargeA = new() { MinWidth = 70 };
    private readonly ComboBox _simChargeB = new() { MinWidth = 70 };
    private readonly StackPanel _simA = new() { Spacing = 2 };
    private readonly StackPanel _simB = new() { Spacing = 2 };
    private readonly Random _rng = new();

    private static readonly Brush Muted = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0x9A, 0x9A, 0x9A));
    private static readonly Brush Header = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0xE0, 0xC0, 0x60));
    private static readonly Brush RawBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0xE8, 0xE8, 0xE8));
    private static readonly Brush EleBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0x7F, 0xD8, 0xF0));
    // Min (Feeble end) reads soft red, Max (crit end) soft green; Avg stays neutral/bold.
    private static readonly Brush MinBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0xDD, 0x90, 0x90));
    private static readonly Brush MaxBrush = new SolidColorBrush(Windows.UI.Color.FromArgb(255, 0x86, 0xC9, 0x86));

    // Shot-type tints, matching the weapon detail page (Rapid blue, Scatter green, Pierce red).
    private static Brush ShotBrush(BowShotType t) => new SolidColorBrush(t switch
    {
        BowShotType.Rapid => Windows.UI.Color.FromArgb(255, 0x6A, 0x9C, 0xFF),
        BowShotType.Scatter => Windows.UI.Color.FromArgb(255, 0x66, 0xCC, 0x66),
        BowShotType.Pierce => Windows.UI.Color.FromArgb(255, 0xFF, 0x6A, 0x6A),
        _ => Windows.UI.Color.FromArgb(255, 0xD4, 0xD4, 0xD4),
    });

    public BowCompareDialog(IReadOnlyList<WeaponRow> bows, WeaponRow? preselect)
    {
        _bows = bows;
        Title = "Compare Bows";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 900.0;

        _pickA = BowCombo();
        _pickB = BowCombo();
        _power = new ToggleSwitch
        {
            Header = "Power Coating (×1.5 raw, where loadable)",
            OffContent = "Off", OnContent = "On",
        };

        // Preselect: A = the bow the user was looking at (if any), B = the next bow along.
        var startA = preselect is null ? 0 : Math.Max(0, IndexOf(preselect));
        _pickA.SelectedIndex = startA;
        _pickB.SelectedIndex = bows.Count > 1 ? (startA + 1) % bows.Count : startA;

        _pickA.SelectionChanged += (_, _) => Refresh();
        _pickB.SelectionChanged += (_, _) => Refresh();
        _power.Toggled += (_, _) => Refresh();

        var pickers = new Grid { ColumnSpacing = 16, Margin = new Thickness(0, 0, 0, 4) };
        pickers.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        pickers.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        Grid.SetColumn(_pickA, 0);
        Grid.SetColumn(_pickB, 1);
        pickers.Children.Add(_pickA);
        pickers.Children.Add(_pickB);

        var tables = new Grid { ColumnSpacing = 16 };
        tables.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        tables.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        Grid.SetColumn(_colA, 0);
        Grid.SetColumn(_colB, 1);
        tables.Children.Add(_colA);
        tables.Children.Add(_colB);

        var note = new TextBlock
        {
            Text = "Best case: every arrow / hit is assumed to land within critical distance. "
                 + "It's a neutral index — hitzone, monster defense, rage and range held at 1.0, so values "
                 + "compare bows directly rather than predicting damage on a specific monster. "
                 + "Raw Min/Avg/Max is the affinity spread: positive affinity ranges normal→crit (×1.0–1.25), "
                 + "negative ranges Feeble→normal (×0.75–1.0); Avg is the expected value. Element carries no "
                 + "crit, so it is single-valued. Raw scales with arrow power, element with arrow count.",
            Foreground = Muted, FontSize = 11, TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 10, 0, 0),
        };

        // Simulate row: a button + an editable shot count + a charge selector per bow.
        var simButton = new Button { Content = "Simulate" };
        simButton.Click += (_, _) => RunSimulation();
        static TextBlock Label(string t) => new() { Text = t, VerticalAlignment = VerticalAlignment.Center, Foreground = Muted };
        var simBar = new StackPanel
        {
            Orientation = Orientation.Horizontal, Spacing = 8,
            VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 10, 0, 0),
        };
        simBar.Children.Add(simButton);
        simBar.Children.Add(_shotCount);
        simBar.Children.Add(Label("shots —  A charge"));
        simBar.Children.Add(_simChargeA);
        simBar.Children.Add(Label("B charge"));
        simBar.Children.Add(_simChargeB);

        var simResults = new Grid { ColumnSpacing = 16 };
        simResults.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        simResults.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        Grid.SetColumn(_simA, 0);
        Grid.SetColumn(_simB, 1);
        simResults.Children.Add(_simA);
        simResults.Children.Add(_simB);

        var root = new StackPanel { Spacing = 8, MinWidth = 700 };
        root.Children.Add(pickers);
        root.Children.Add(_power);
        root.Children.Add(ShotTypeLegend());
        root.Children.Add(tables);
        root.Children.Add(simBar);
        root.Children.Add(simResults);
        root.Children.Add(note);

        Content = new ScrollViewer
        {
            Content = root,
            MaxHeight = 720,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };

        Refresh();
    }

    private ComboBox BowCombo()
    {
        var c = new ComboBox { HorizontalAlignment = HorizontalAlignment.Stretch };
        foreach (var b in _bows) c.Items.Add(b.Name);
        return c;
    }

    private int IndexOf(WeaponRow row)
    {
        for (var i = 0; i < _bows.Count; i++)
            if (_bows[i].WeaponPk == row.WeaponPk) return i;
        return 0;
    }

    private void Refresh()
    {
        BuildColumn(_colA, _pickA.SelectedIndex);
        BuildColumn(_colB, _pickB.SelectedIndex);
        SyncChargeOptions();
        _simA.Children.Clear();   // bows changed — prior burst is stale
        _simB.Children.Clear();
    }

    // Populate each bow's charge selector with its own 1..N charge levels, keeping the prior pick if valid.
    private void SyncChargeOptions()
    {
        Fill(_simChargeA, SpecAt(_pickA.SelectedIndex)?.Charges.Count ?? 0);
        Fill(_simChargeB, SpecAt(_pickB.SelectedIndex)?.Charges.Count ?? 0);

        static void Fill(ComboBox combo, int count)
        {
            var prev = combo.SelectedItem as string;
            combo.Items.Clear();
            for (var lv = 1; lv <= count; lv++) combo.Items.Add($"Lv{lv}");
            if (count == 0) return;
            var idx = prev is not null ? combo.Items.IndexOf(prev) : -1;
            combo.SelectedIndex = idx >= 0 ? idx : count - 1;   // default to the bow's highest charge
        }
    }

    private BowSpec? SpecAt(int index) =>
        index >= 0 && index < _bows.Count ? BowDamage.Parse(_bows[index]) : null;

    private void RunSimulation()
    {
        var a = SpecAt(_pickA.SelectedIndex);
        var b = SpecAt(_pickB.SelectedIndex);

        // Editable shot count; NumberBox can hold NaN if the field was cleared.
        var shots = double.IsNaN(_shotCount.Value) ? DefaultBurstShots : (int)Math.Round(_shotCount.Value);
        shots = Math.Clamp(shots, 1, (int)_shotCount.Maximum);

        BowSimulation? simA = a is not null && _simChargeA.SelectedIndex >= 0
            ? BowSimulator.Simulate(a, a.Charges[_simChargeA.SelectedIndex], _power.IsOn, shots, _rng) : null;
        BowSimulation? simB = b is not null && _simChargeB.SelectedIndex >= 0
            ? BowSimulator.Simulate(b, b.Charges[_simChargeB.SelectedIndex], _power.IsOn, shots, _rng) : null;

        // Scale both burst strips to a shared max so taller bar = more damage across the pair.
        var scaleMax = Math.Max(simA?.MaxRaw ?? 1, simB?.MaxRaw ?? 1);
        BuildSim(_simA, a, simA, scaleMax);
        BuildSim(_simB, b, simB, scaleMax);
    }

    private void BuildSim(StackPanel col, BowSpec? spec, BowSimulation? sim, double scaleMax)
    {
        col.Children.Clear();
        if (spec is null || sim is null) return;

        col.Children.Add(new TextBlock
        {
            Text = $"{spec.Name} — {sim.Shot.ShotType} {sim.Shot.ShotLevel}",
            Foreground = RawBrush, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, FontSize = 12,
        });

        // Burst strip: one bar per shot, height ∝ raw, tinted by luck vs a normal (×1.0) shot.
        var strip = new StackPanel
        {
            Orientation = Orientation.Horizontal, Spacing = 2, Height = 50,
            VerticalAlignment = VerticalAlignment.Bottom, Margin = new Thickness(0, 2, 0, 2),
        };
        foreach (var s in sim.Shots)
        {
            var ratio = sim.NormalRaw > 0 ? s.Raw / sim.NormalRaw : 1.0;
            var brush = ratio > 1.005 ? MaxBrush : ratio < 0.995 ? MinBrush : RawBrush;
            strip.Children.Add(new Border
            {
                Width = 9, Height = Math.Max(3.0, s.Raw / scaleMax * 46.0),
                Background = brush, CornerRadius = new CornerRadius(1),
                VerticalAlignment = VerticalAlignment.Bottom,
            });
        }
        col.Children.Add(strip);

        var feeblePct = sim.TotalHits > 0 ? 100.0 * sim.TotalFeebles / sim.TotalHits : 0;
        var critPct = sim.TotalHits > 0 ? 100.0 * sim.TotalCrits / sim.TotalHits : 0;
        col.Children.Add(new TextBlock
        {
            Text = $"Avg {sim.AvgRaw:0.0} · Low {sim.MinRaw:0.0} · High {sim.MaxRaw:0.0}",
            Foreground = RawBrush, FontSize = 12,
        });
        var roll = critPct > 0 ? $"Crit {critPct:0}% of arrows" : feeblePct > 0 ? $"Feeble {feeblePct:0}% of arrows" : "no crit/Feeble";
        var rollLine = new TextBlock { FontSize = 11, Foreground = Muted };
        rollLine.Inlines.Add(new Microsoft.UI.Xaml.Documents.Run { Text = roll });
        if (sim.Element > 0)
            rollLine.Inlines.Add(new Microsoft.UI.Xaml.Documents.Run
            {
                Text = $"   +{spec.Element} {sim.Element:0.0} (no crit)", Foreground = EleBrush,
            });
        col.Children.Add(rollLine);
    }

    // One-line behaviour note per shot type, so the patterns explain how each shot actually plays.
    private static string Behaviour(BowShotType t) => t switch
    {
        BowShotType.Rapid => "arrows stack on one spot — all hits land reliably.",
        BowShotType.Pierce => "passes through the target — every tick lands only on a long, aligned body.",
        BowShotType.Scatter => "pellets fan out — several often miss the target part.",
        _ => "",
    };

    // Per-bow shot reference: the distinct shot type+levels this bow fires (in charge order), with
    // their per-arrow power patterns and hit counts, then a behaviour note per type it uses.
    private void AppendShotReference(StackPanel col, BowSpec spec)
    {
        var pairs = new List<(BowShotType Type, int Level)>();
        foreach (var c in spec.Charges)
            if (!pairs.Contains((c.ShotType, c.ShotLevel))) pairs.Add((c.ShotType, c.ShotLevel));
        if (pairs.Count == 0) return;

        col.Children.Add(new TextBlock
        {
            Text = "Shot patterns — per-arrow power",
            FontWeight = Microsoft.UI.Text.FontWeights.SemiBold, Foreground = Header, FontSize = 12,
            Margin = new Thickness(0, 8, 0, 1),
        });

        foreach (var (type, level) in pairs)
        {
            var arrows = BowDamage.ArrowPowers(type, level);
            var g = new Grid();
            foreach (var w in new[] { 78.0, 128.0, 56.0 })
                g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(w) });
            Add(g, 0, $"{type} {level}", ShotBrush(type), true, false);
            Add(g, 1, string.Join("-", arrows), RawBrush, false, false);
            Add(g, 2, $"{arrows.Count} hit{(arrows.Count == 1 ? "" : "s")}", Muted, false, false);
            col.Children.Add(g);
        }
    }

    // Static legend explaining all three shot types once, above the per-bow tables.
    private static StackPanel ShotTypeLegend()
    {
        var panel = new StackPanel { Spacing = 1 };
        panel.Children.Add(new TextBlock
        {
            Text = "Shot types", FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
            Foreground = Header, FontSize = 12,
        });
        foreach (var type in new[] { BowShotType.Rapid, BowShotType.Scatter, BowShotType.Pierce })
        {
            var tb = new TextBlock { FontSize = 11, TextWrapping = TextWrapping.Wrap };
            tb.Inlines.Add(new Microsoft.UI.Xaml.Documents.Run
            {
                Text = type.ToString(), Foreground = ShotBrush(type),
                FontWeight = Microsoft.UI.Text.FontWeights.SemiBold,
            });
            tb.Inlines.Add(new Microsoft.UI.Xaml.Documents.Run { Text = $" — {Behaviour(type)}", Foreground = Muted });
            panel.Children.Add(tb);
        }
        return panel;
    }

    private void BuildColumn(StackPanel col, int index)
    {
        col.Children.Clear();
        if (index < 0 || index >= _bows.Count) return;

        var spec = BowDamage.Parse(_bows[index]);
        if (spec is null)
        {
            col.Children.Add(new TextBlock { Text = "Not a bow.", Foreground = Muted });
            return;
        }

        // Header: name + key stats.
        col.Children.Add(new TextBlock
        {
            Text = spec.Name, FontWeight = Microsoft.UI.Text.FontWeights.Bold,
            FontSize = 15, Foreground = RawBrush, TextWrapping = TextWrapping.Wrap,
        });
        var sub = $"Atk {spec.Attack}";
        if (spec.Affinity != 0) sub += $"   Affinity {(spec.Affinity > 0 ? "+" : "")}{spec.Affinity}%";
        if (spec.Element != BowElement.None) sub += $"   {spec.Element} {spec.ElementValue}";
        col.Children.Add(new TextBlock { Text = sub, Foreground = Muted, FontSize = 12, Margin = new Thickness(0, 0, 0, 6) });

        var rows = BowDamage.Compute(spec, _power.IsOn);
        var poweredButUnsupported = _power.IsOn && !spec.HasPowerCoating;

        col.Children.Add(HeaderRow());
        foreach (var r in rows) col.Children.Add(DataRow(r, spec.Element != BowElement.None));

        if (poweredButUnsupported)
            col.Children.Add(new TextBlock
            {
                Text = "Power Coating not loadable — raw shown unboosted.",
                Foreground = Muted, FontSize = 11, FontStyle = Windows.UI.Text.FontStyle.Italic,
                Margin = new Thickness(0, 4, 0, 0),
            });

        AppendShotReference(col, spec);
    }

    // Column layout: Charge | Shot | Raw Min | Raw Avg | Raw Max | Element
    private static readonly double[] Cols = { 44, 80, 52, 52, 52, 56 };

    private Grid RowGrid()
    {
        var g = new Grid();
        foreach (var w in Cols) g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(w) });
        return g;
    }

    private Grid HeaderRow()
    {
        var g = RowGrid();
        Add(g, 0, "Chg", Header, true, false);
        Add(g, 1, "Shot", Header, true, false);
        Add(g, 2, "Min", Header, true, true);
        Add(g, 3, "Avg", Header, true, true);
        Add(g, 4, "Max", Header, true, true);
        Add(g, 5, "Elem", Header, true, true);
        return g;
    }

    private Grid DataRow(BowChargeDamage r, bool hasElement)
    {
        var g = RowGrid();
        Add(g, 0, $"Lv{r.ChargeLevel}", RawBrush, false, false);
        Add(g, 1, $"{r.ShotType} {r.ShotLevel}", ShotBrush(r.ShotType), false, false);
        Add(g, 2, r.RawMin.ToString("0.0"), MinBrush, false, true);
        Add(g, 3, r.RawAvg.ToString("0.0"), RawBrush, true, true);
        Add(g, 4, r.RawMax.ToString("0.0"), MaxBrush, false, true);
        Add(g, 5, hasElement ? r.Element.ToString("0.0") : "—", hasElement ? EleBrush : Muted, false, true);
        return g;
    }

    private static void Add(Grid g, int col, string text, Brush brush, bool bold, bool right)
    {
        var tb = new TextBlock
        {
            Text = text, Foreground = brush, FontSize = 13, Padding = new Thickness(0, 2, 0, 2),
            FontWeight = bold ? Microsoft.UI.Text.FontWeights.SemiBold : Microsoft.UI.Text.FontWeights.Normal,
            HorizontalAlignment = right ? HorizontalAlignment.Right : HorizontalAlignment.Left,
        };
        Grid.SetColumn(tb, col);
        g.Children.Add(tb);
    }
}
