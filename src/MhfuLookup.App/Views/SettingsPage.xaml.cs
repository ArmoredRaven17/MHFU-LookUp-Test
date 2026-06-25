using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class SettingsPage : Page
{
    public SettingsViewModel ViewModel { get; } = new();
    public TabIconsViewModel IconVm { get; } = new();
    public AppearanceViewModel AppearanceVm { get; } = new();

    public SettingsPage() => InitializeComponent();

    private async void RestoreDefaults_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new ContentDialog
        {
            Title = "Restore defaults?",
            Content = "This resets UI scale, the app icon, the colour theme, and all tab icons to their defaults.",
            PrimaryButtonText = "Restore",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
        };
        if (await dialog.ShowAsync() != ContentDialogResult.Primary) return;

        ViewModel.SelectedScale = "100%";   // UI scale
        AppearanceVm.ResetToDefaults();      // app icon + colour theme
        IconVm.ResetToDefaults();            // tab icons
    }
}
