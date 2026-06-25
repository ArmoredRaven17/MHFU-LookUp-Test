using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

/// <summary>Multi-criteria weapon filter dialog (port of app/weapon_filter.py FilterDialog).</summary>
public sealed class WeaponFilterDialog : ContentDialog
{
    private static readonly (string Key, string Label)[] ElementDefs =
    {
        ("Raw", "Raw"), ("Fir", "Fire"), ("Wtr", "Water"), ("Thn", "Thunder"), ("Ice", "Ice"),
        ("Drg", "Dragon"), ("Poi", "Poison"), ("Par", "Para"), ("Slp", "Sleep"),
    };
    private static readonly (string Key, string Label)[] CoatingDefs =
    {
        ("Pwr", "Power"), ("Poi", "Poison"), ("Par", "Para"), ("Slp", "Sleep"), ("Pnt", "Paint"), ("Cls", "Close-range"),
    };
    private static readonly string[] ShotTypeDefs = { "Rapid", "Pierce", "Scatter" };
    private static readonly (string Key, string Label)[] AmmoRawDefs =
        { ("Normal", "Normal"), ("Pierce", "Pierce"), ("Pellet", "Pellet"), ("Crag", "Crag"), ("Clust", "Clust") };
    private static readonly (string Key, string Label)[] AmmoSupportDefs =
        { ("Recov", "Recov"), ("Poison", "Poison"), ("Para", "Para"), ("Sleep", "Sleep") };
    private static readonly (string Key, string Label)[] AmmoElementDefs =
        { ("Flame", "Flame"), ("Water", "Water"), ("Thndr", "Thunder"), ("Ice", "Ice"), ("Drgon", "Dragon") };
    private static readonly (string Key, string Label)[] AmmoOtherDefs =
        { ("Tranq", "Tranq"), ("Paint", "Paint"), ("Demn", "Demon"), ("Armor", "Armor") };
    private static readonly string[] SharpnessLevels = { "Any", "Yellow", "Green", "Blue", "White", "Purple" };
    // Hunting Horn notes: the first note is always White or Purple; the other two are any other colour.
    private static readonly (string Letter, string Label)[] FirstNoteDefs =
        { ("", "Any"), ("W", "White"), ("P", "Purple") };
    private static readonly (string Letter, string Label)[] OtherNoteDefs =
        { ("", "Any"), ("B", "Blue"), ("A", "Aqua"), ("Y", "Yellow"), ("R", "Red"), ("G", "Green") };
    private static readonly Dictionary<string, string> NoteLetter = new()
    {
        ["Any"] = "", ["White"] = "W", ["Purple"] = "P", ["Blue"] = "B",
        ["Aqua"] = "A", ["Yellow"] = "Y", ["Red"] = "R", ["Green"] = "G",
    };

    private readonly TextBox _name;
    private readonly Dictionary<string, CheckBox> _elements;
    private readonly NumberBox _minAtk;
    private readonly ComboBox _minSlots;
    private readonly ComboBox _affinity;
    private readonly CheckBox _defBonus;
    private readonly ComboBox? _sharpness;
    private readonly Dictionary<string, CheckBox>? _coatings;
    private readonly Dictionary<string, (CheckBox Cb, ComboBox Lvl)>? _shots;
    private readonly Dictionary<string, CheckBox>? _ammoRaw;
    private readonly Dictionary<string, CheckBox>? _ammoSupport;
    private readonly Dictionary<string, CheckBox>? _ammoElement;
    private readonly Dictionary<string, CheckBox>? _ammoOther;
    private readonly ComboBox? _note1;
    private readonly ComboBox? _note2;
    private readonly ComboBox? _note3;
    private bool _syncingNotes;
    private readonly ComboBox? _shellType;
    private readonly ComboBox? _shellLevel;

    public WeaponFilter Result { get; private set; }

    public WeaponFilterDialog(WeaponFilter current, string type)
    {
        Result = current;
        Title = $"Weapon Filters — {type}";
        PrimaryButtonText = "Apply";
        SecondaryButtonText = "Clear All";
        CloseButtonText = "Cancel";
        DefaultButton = ContentDialogButton.Primary;
        PrimaryButtonClick += (_, _) => Result = Gather();

        // Allow the dialog to be wide enough that the widest checkbox row fits without a
        // horizontal scrollbar (the default ContentDialog max width can be narrower than that).
        Resources["ContentDialogMaxWidth"] = 760.0;

        var isMelee = WeaponFilter.MeleeTypes.Contains(type);
        var isBow = type == "Bow";
        var isBowgun = type is "Light Bowgun" or "Heavy Bowgun";

        var root = new StackPanel { Spacing = 10, MinWidth = 560 };

        _name = new TextBox { PlaceholderText = "Substring match…", Text = current.Name };
        root.Children.Add(Section("Name", _name));

        (var elemPanel, _elements) = CheckGroup(ElementDefs, current.Elements);
        root.Children.Add(Section("Element  (any checked must match)", elemPanel));

        _minAtk = new NumberBox { Minimum = 0, Value = current.MinAtk, SpinButtonPlacementMode = NumberBoxSpinButtonPlacementMode.Compact };
        _minSlots = Combo(new[] { "Any", "1+", "2+", "3" }, current.MinSlots);
        var statsRow = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
        statsRow.Children.Add(new TextBlock { Text = "Min Attack:", VerticalAlignment = VerticalAlignment.Center });
        statsRow.Children.Add(_minAtk);
        statsRow.Children.Add(new TextBlock { Text = "Min Slots:", VerticalAlignment = VerticalAlignment.Center });
        statsRow.Children.Add(_minSlots);
        root.Children.Add(Section("Stats", statsRow));

        _affinity = Combo(new[] { "Any", "Positive only", "Negative only" },
            current.Affinity == "positive" ? 1 : current.Affinity == "negative" ? 2 : 0);
        root.Children.Add(Section("Affinity", _affinity));

        _defBonus = new CheckBox { Content = "Only weapons with a Defense bonus", IsChecked = current.DefBonus };
        root.Children.Add(_defBonus);

        if (isMelee)
        {
            _sharpness = Combo(SharpnessLevels, Math.Max(0, Array.IndexOf(SharpnessLevels, current.MinSharpness)));
            var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
            row.Children.Add(new TextBlock { Text = "Reaches at least:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_sharpness);
            root.Children.Add(Section("Sharpness", row));
        }

        if (type == "Hunting Horn")
        {
            _note1 = NoteCombo(FirstNoteDefs, current.Notes.ElementAtOrDefault(0) ?? "");
            _note2 = NoteCombo(OtherNoteDefs, current.Notes.ElementAtOrDefault(1) ?? "");
            _note3 = NoteCombo(OtherNoteDefs, current.Notes.ElementAtOrDefault(2) ?? "");
            // A horn's three notes are always different colours, so the 2nd and 3rd can't repeat.
            _note2.SelectionChanged += (_, _) => SyncNotes(_note2!, _note3!);
            _note3.SelectionChanged += (_, _) => SyncNotes(_note3!, _note2!);
            SyncNotes(_note2, _note3);
            SyncNotes(_note3, _note2);
            var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
            row.Children.Add(new TextBlock { Text = "1st:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_note1);
            row.Children.Add(new TextBlock { Text = "2nd:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_note2);
            row.Children.Add(new TextBlock { Text = "3rd:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_note3);
            root.Children.Add(Section("Notes  (the horn must have these notes; 1st is White/Purple)", row));
        }

        if (type == "Gunlance")
        {
            _shellType = Combo(new[] { "Any", "Normal", "Long", "Spread" },
                current.ShellType switch { "Normal" => 1, "Long" => 2, "Spread" => 3, _ => 0 });
            _shellLevel = Combo(new[] { "Any", "1+", "2+", "3+", "4+", "5" }, Math.Clamp(current.ShellLevelMin, 0, 5));
            var row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
            row.Children.Add(new TextBlock { Text = "Type:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_shellType);
            row.Children.Add(new TextBlock { Text = "Level:", VerticalAlignment = VerticalAlignment.Center });
            row.Children.Add(_shellLevel);
            root.Children.Add(Section("Shells  (the gunlance's shelling type / minimum level)", row));
        }

        if (isBow)
        {
            (var coatPanel, _coatings) = CheckGroup(CoatingDefs, current.Coatings);
            root.Children.Add(Section("Coatings  (any checked must be supported)", coatPanel));

            _shots = new();
            var shotPanel = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
            foreach (var st in ShotTypeDefs)
            {
                var has = current.ShotTypes.TryGetValue(st, out var lvl);
                var cb = new CheckBox { Content = st, IsChecked = has };
                var combo = Combo(new[] { "1", "2", "3", "4", "5" }, has ? lvl - 1 : 0);
                combo.IsEnabled = has;
                cb.Checked += (_, _) => combo.IsEnabled = true;
                cb.Unchecked += (_, _) => combo.IsEnabled = false;
                var pair = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 4 };
                pair.Children.Add(cb);
                pair.Children.Add(combo);
                shotPanel.Children.Add(pair);
                _shots[st] = (cb, combo);
            }
            root.Children.Add(Section("Shot Types  (each checked must be present at/above level)", shotPanel));
        }

        if (isBowgun)
        {
            (var p1, _ammoRaw) = CheckGroup(AmmoRawDefs, current.AmmoRaw);
            root.Children.Add(Section("Raw Ammo  (any checked must be available)", p1));
            (var p2, _ammoSupport) = CheckGroup(AmmoSupportDefs, current.AmmoSupport);
            root.Children.Add(Section("Support Ammo", p2));
            (var p3, _ammoElement) = CheckGroup(AmmoElementDefs, current.AmmoElement);
            root.Children.Add(Section("Element Ammo", p3));
            (var p4, _ammoOther) = CheckGroup(AmmoOtherDefs, current.AmmoOther);
            root.Children.Add(Section("Other Ammo", p4));
        }

        // Cap tall enough that Bow's full set of sections shows without a scrollbar when the
        // window has room; the dialog still scrolls gracefully on very short windows.
        // Bowgun has the most sections, so give it the most headroom.
        var maxHeight = isBowgun ? 860.0 : 760.0;

        // No horizontal scrolling — the dialog is sized wide enough for the content to fit, so
        // a horizontal scrollbar would only overlay the bottom rows.
        Content = new ScrollViewer
        {
            Content = root,
            MaxHeight = maxHeight,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };
    }

    private WeaponFilter Gather()
    {
        var f = new WeaponFilter
        {
            Name = _name.Text.Trim(),
            Elements = _elements.Where(kv => kv.Value.IsChecked == true).Select(kv => kv.Key).ToHashSet(),
            MinAtk = double.IsNaN(_minAtk.Value) ? 0 : (int)_minAtk.Value,
            MinSlots = Math.Max(0, _minSlots.SelectedIndex),
            Affinity = _affinity.SelectedIndex switch { 1 => "positive", 2 => "negative", _ => "any" },
            DefBonus = _defBonus.IsChecked == true,
        };
        if (_sharpness is not null) f.MinSharpness = _sharpness.SelectedItem as string ?? "Any";
        if (_coatings is not null)
            f.Coatings = _coatings.Where(kv => kv.Value.IsChecked == true).Select(kv => kv.Key).ToHashSet();
        if (_shots is not null)
            f.ShotTypes = _shots.Where(kv => kv.Value.Cb.IsChecked == true)
                .ToDictionary(kv => kv.Key, kv => kv.Value.Lvl.SelectedIndex + 1);
        if (_ammoRaw is not null) f.AmmoRaw = Checked(_ammoRaw);
        if (_ammoSupport is not null) f.AmmoSupport = Checked(_ammoSupport);
        if (_ammoElement is not null) f.AmmoElement = Checked(_ammoElement);
        if (_ammoOther is not null) f.AmmoOther = Checked(_ammoOther);
        if (_note1 is not null)
            f.Notes = new[]
            {
                NoteLetter[(string)(_note1.SelectedItem ?? "Any")],
                NoteLetter[(string)(_note2!.SelectedItem ?? "Any")],
                NoteLetter[(string)(_note3!.SelectedItem ?? "Any")],
            };
        if (_shellType is not null)
            f.ShellType = _shellType.SelectedIndex switch { 1 => "Normal", 2 => "Long", 3 => "Spread", _ => "" };
        if (_shellLevel is not null) f.ShellLevelMin = _shellLevel.SelectedIndex;   // 0=Any, 1="1+" … 5="5"
        return f;
    }

    private static HashSet<string> Checked(Dictionary<string, CheckBox> m) =>
        m.Where(kv => kv.Value.IsChecked == true).Select(kv => kv.Key).ToHashSet();

    private static FrameworkElement Section(string title, FrameworkElement content)
    {
        var panel = new StackPanel { Spacing = 4 };
        panel.Children.Add(new TextBlock { Text = title, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold });
        panel.Children.Add(content);
        return panel;
    }

    private static (StackPanel, Dictionary<string, CheckBox>) CheckGroup(
        (string Key, string Label)[] items, ISet<string> selected, int perRow = 5)
    {
        var outer = new StackPanel { Spacing = 4 };
        var map = new Dictionary<string, CheckBox>();
        StackPanel? row = null;
        for (var i = 0; i < items.Length; i++)
        {
            if (i % perRow == 0)
            {
                row = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
                outer.Children.Add(row);
            }
            var cb = new CheckBox { Content = items[i].Label, IsChecked = selected.Contains(items[i].Key) };
            map[items[i].Key] = cb;
            row!.Children.Add(cb);
        }
        return (outer, map);
    }

    private static ComboBox Combo(string[] items, int selectedIndex)
    {
        var c = new ComboBox { MinWidth = 90 };
        foreach (var i in items) c.Items.Add(i);
        c.SelectedIndex = Math.Clamp(selectedIndex, 0, items.Length - 1);
        return c;
    }

    private static ComboBox NoteCombo((string Letter, string Label)[] defs, string current)
    {
        var c = new ComboBox { MinWidth = 100 };
        foreach (var d in defs) c.Items.Add(d.Label);
        var idx = Array.FindIndex(defs, d => d.Letter == current);
        c.SelectedIndex = idx < 0 ? 0 : idx;
        return c;
    }

    // Rebuild the dependent note dropdown to exclude the driver's chosen colour (horns never repeat a
    // colour), preserving the dependent's current selection when it's still valid.
    private void SyncNotes(ComboBox driver, ComboBox dependent)
    {
        if (_syncingNotes) return;
        _syncingNotes = true;
        try
        {
            var exclude = NoteLetter[(string)(driver.SelectedItem ?? "Any")];
            var keep = (string)(dependent.SelectedItem ?? "Any");
            dependent.Items.Clear();
            foreach (var (letter, label) in OtherNoteDefs)
                if (letter.Length == 0 || letter != exclude) dependent.Items.Add(label);
            var idx = -1;
            for (var i = 0; i < dependent.Items.Count; i++)
                if ((string)dependent.Items[i] == keep) { idx = i; break; }
            dependent.SelectedIndex = idx < 0 ? 0 : idx;
        }
        finally { _syncingNotes = false; }
    }
}