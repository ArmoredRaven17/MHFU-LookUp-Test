using CommunityToolkit.Mvvm.ComponentModel;
using Microsoft.UI.Xaml.Media;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

public sealed record AppIconOption(string Id, string Name);
public sealed record ThemeColorOption(string Key, string Name, Brush Swatch);

public sealed partial class AppearanceViewModel : ObservableObject
{
    public List<AppIconOption> Icons { get; }
    public List<ThemeColorOption> Colors { get; }

    [ObservableProperty] private AppIconOption? selectedIcon;
    [ObservableProperty] private ThemeColorOption? selectedColor;

    public AppearanceViewModel()
    {
        Icons = new List<AppIconOption> { new("_unknown", "Question Mark") };
        Icons.AddRange(AppDb.Instance.GetMonsters()
            .Select(m => new AppIconOption(m.Id, m.Name))
            .OrderBy(m => m.Name, StringComparer.OrdinalIgnoreCase));
        SelectedIcon = Icons.FirstOrDefault(i => i.Id == Appearance.IconId) ?? Icons[0];

        Colors = Appearance.Presets
            .Select(p => new ThemeColorOption(p.Key, p.Name, new SolidColorBrush(Appearance.Hex(p.Swatch))))
            .ToList();
        SelectedColor = Colors.FirstOrDefault(c => c.Key == Appearance.ColorId) ?? Colors[0];
    }

    partial void OnSelectedIconChanged(AppIconOption? value)
    {
        if (value is not null) Appearance.IconId = value.Id;
    }

    partial void OnSelectedColorChanged(ThemeColorOption? value)
    {
        if (value is not null) Appearance.ColorId = value.Key;
    }

    /// <summary>Reset icon + colour to the built-in defaults (cascades to Appearance via the setters).</summary>
    public void ResetToDefaults()
    {
        SelectedColor = Colors.FirstOrDefault(c => c.Key == Appearance.DefaultColor) ?? Colors[0];
        SelectedIcon = Icons.FirstOrDefault(i => i.Id == Appearance.DefaultIcon) ?? Icons[0];
    }
}
