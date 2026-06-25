using System.Globalization;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.ViewModels;

public sealed partial class SettingsViewModel : ObservableObject
{
    private bool _loading;

    public List<string> Scales { get; } = new() { "75%", "100%", "125%", "150%", "175%", "200%" };

    [ObservableProperty] private string selectedScale = "100%";

    public SettingsViewModel()
    {
        _loading = true;
        var stored = AppDb.Instance.GetSetting("ui_scale") ?? "1.0";
        if (double.TryParse(stored, NumberStyles.Float, CultureInfo.InvariantCulture, out var f))
            SelectedScale = $"{(int)Math.Round(f * 100)}%";
        _loading = false;
    }

    partial void OnSelectedScaleChanged(string value)
    {
        if (_loading) return;
        var pct = int.Parse(value.TrimEnd('%'), CultureInfo.InvariantCulture);
        var factor = pct / 100.0;
        AppScale.Current = factor;  // apply live
        AppDb.Instance.SetSetting("ui_scale", factor.ToString("0.0#", CultureInfo.InvariantCulture));
    }
}
