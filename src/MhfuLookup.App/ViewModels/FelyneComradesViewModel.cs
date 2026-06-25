using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

/// <summary>A Felyne Comrades article section for the picker: title, prose body, and which data table
/// (if any) renders beneath it ("" | "weapons" | "skills" | "temperaments").</summary>
public sealed record ComradeSection(string Title, string Body, string TableKind);

/// <summary>Recommended Comrade weapon for an attack-power tier, with the damage-formula Weapon
/// Divider. Alt drives zebra-striping.</summary>
public sealed record ComradeWeapon(string AttackPower, string Slash, string Impact, string Divider, bool Alt = false);

/// <summary>A trainable Comrade skill. Alt drives zebra-striping.</summary>
public sealed record ComradeSkill(string Skill, string Cost, string Description, string Unlock, bool Alt = false);

/// <summary>A Comrade temperament (personality), with per-cell colours coding its behaviour. Alt drives
/// zebra-striping.</summary>
public sealed record ComradeTemperament(
    string Character, string AttackPref, string Healing, string Target,
    Brush AttackPrefColor, Brush HealingColor, Brush TargetColor, bool Alt = false);

// ── Parsed prose blocks: a section body becomes a sequence of paragraphs, sub-headers, and tables. ──
/// <summary>A plain prose paragraph.</summary>
public sealed record ProseParagraph(string Text);
/// <summary>A sub-section heading (e.g. AID, FIGHTING STYLE).</summary>
public sealed record ProseHeader(string Text);
/// <summary>One row of a prose table. For single-column lists, Value is "".</summary>
public sealed record ProseRow(string Label, string Value, bool Alt);
/// <summary>A bullet run rendered as a table — two-column when every bullet is "Label: value".</summary>
public sealed record ProseTable(IReadOnlyList<ProseRow> Rows, bool TwoColumn)
{
    public bool OneColumn => !TwoColumn;
}

public sealed partial class FelyneComradesViewModel : ObservableObject
{
    public List<ComradeSection> Sections { get; }
    public ObservableCollection<object> BodyBlocks { get; } = new();
    public ObservableCollection<ComradeWeapon> Weapons { get; } = new();
    public ObservableCollection<ComradeSkill> Skills { get; } = new();
    public ObservableCollection<ComradeTemperament> Temperaments { get; } = new();

    [ObservableProperty] private ComradeSection? selectedSection;

    public FelyneComradesViewModel()
    {
        Sections = AppDb.Instance.GetComradeSections()
            .Select(s => new ComradeSection(s.Title, s.Body, s.TableKind)).ToList();

        // The three data tables are fixed; load once with alternating-row flags, toggle visibility per section.
        var w = 0;
        foreach (var r in AppDb.Instance.GetComradeWeapons())
            Weapons.Add(new ComradeWeapon(r.AttackPower, r.Slash, r.Impact, r.Divider, w++ % 2 == 1));
        var s2 = 0;
        foreach (var r in AppDb.Instance.GetComradeSkills())
            Skills.Add(new ComradeSkill(r.Skill, r.Cost, r.Description, r.Unlock, s2++ % 2 == 1));
        var t = 0;
        foreach (var r in AppDb.Instance.GetComradeTemperaments())
            Temperaments.Add(new ComradeTemperament(r.Character, r.AttackPref, r.Healing, r.Target,
                PrefColor(r.AttackPref), HealColor(r.Healing), TargetColor(r.Target), t++ % 2 == 1));

        SelectedSection = Sections.FirstOrDefault();
    }

    // ── Temperament cell colours ──────────────────────────────────────────────
    private static Brush Res(string key) => (Brush)Application.Current.Resources[key];
    private static Brush Hex(string hex) => new SolidColorBrush(Windows.UI.Color.FromArgb(255,
        Convert.ToByte(hex.Substring(1, 2), 16), Convert.ToByte(hex.Substring(3, 2), 16), Convert.ToByte(hex.Substring(5, 2), 16)));

    /// <summary>Attack preference: bombs = amber, melee/weapon = red, no-attack = muted, else neutral.</summary>
    private static Brush PrefColor(string s) =>
        s.Contains("Bomb") ? Hex("#E0A040")
        : s.Contains("Melee") || s.Contains("Weapon") ? Hex("#D87070")
        : s.Contains("No Attack") ? Res("MutedTextBrush")
        : Res("TextBrush");

    /// <summary>Healing rate: a green (fast) → red (slow) scale; normal = neutral.</summary>
    private static Brush HealColor(string s) =>
        s.Contains("VryFast") ? Hex("#4CD964")
        : s.Contains("Fast") ? Hex("#7FC97F")
        : s.Contains("VrySlow") ? Res("NegativeBrush")
        : s.Contains("Slow") ? Hex("#E0A040")
        : Res("TextBrush");

    /// <summary>Attacking target: large = red, small = blue, no-attack = muted, else neutral.</summary>
    private static Brush TargetColor(string s) =>
        s.Contains("Lg") ? Hex("#D87070")
        : s.Contains("Sm") ? Hex("#4A9EFF")
        : s.Contains("No Attack") ? Res("MutedTextBrush")
        : Res("TextBrush");

    /// <summary>Heading for the right pane (the selected section title).</summary>
    public string Title => SelectedSection?.Title ?? "";
    public bool ShowWeapons => SelectedSection?.TableKind == "weapons";
    public bool ShowSkills => SelectedSection?.TableKind == "skills";
    public bool ShowTemperaments => SelectedSection?.TableKind == "temperaments";

    partial void OnSelectedSectionChanged(ComradeSection? value)
    {
        RebuildBody();
        OnPropertyChanged(nameof(Title));
        OnPropertyChanged(nameof(ShowWeapons));
        OnPropertyChanged(nameof(ShowSkills));
        OnPropertyChanged(nameof(ShowTemperaments));
    }

    /// <summary>Parse the selected section's body into paragraph / header / table blocks. Runs of "• "
    /// bullets become a table — two-column when every bullet is a "Label: value" pair, else a single
    /// column. UPPERCASE lines become sub-headers; other lines are paragraphs.</summary>
    private void RebuildBody()
    {
        BodyBlocks.Clear();
        var bullets = new List<string>();

        void Flush()
        {
            if (bullets.Count == 0) return;
            var twoCol = bullets.All(b => b.Contains(": "));
            var rows = new List<ProseRow>();
            for (var i = 0; i < bullets.Count; i++)
            {
                var b = bullets[i];
                if (twoCol)
                {
                    var idx = b.IndexOf(": ", StringComparison.Ordinal);
                    rows.Add(new ProseRow(b[..idx], b[(idx + 2)..], i % 2 == 1));
                }
                else
                {
                    rows.Add(new ProseRow(b, "", i % 2 == 1));
                }
            }
            BodyBlocks.Add(new ProseTable(rows, twoCol));
            bullets.Clear();
        }

        foreach (var raw in (SelectedSection?.Body ?? "").Split('\n'))
        {
            var line = raw.Trim();
            if (line.Length == 0) continue;
            if (line.StartsWith("• ", StringComparison.Ordinal)) { bullets.Add(line[2..].Trim()); continue; }
            Flush();
            if (line == line.ToUpperInvariant() && line.Any(char.IsLetter))
                BodyBlocks.Add(new ProseHeader(line));
            else
                BodyBlocks.Add(new ProseParagraph(line));
        }
        Flush();
    }
}
