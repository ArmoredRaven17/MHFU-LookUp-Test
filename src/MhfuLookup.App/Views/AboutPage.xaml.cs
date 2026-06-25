using System;
using System.IO;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.Views;

public sealed partial class AboutPage : Page
{
    public AboutPage() => InitializeComponent();

    // Open the bundled gathering-extraction write-up in an in-app modal (works fully offline — no
    // GitHub link, no dependency on an external Markdown handler).
    private async void GatherDoc_Click(object sender, RoutedEventArgs e)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "docs", "gather-extraction.md");
        string text;
        try { text = File.ReadAllText(path); }
        catch { text = "The document could not be found."; }

        var surface = (Brush)Application.Current.Resources["TableBgOpaqueBrush"];
        var dialog = new ContentDialog
        {
            Title = "Gathering Rates — Extraction Method",
            CloseButtonText = "Close",
            DefaultButton = ContentDialogButton.Close,
            XamlRoot = XamlRoot,
            Background = surface,
            Content = new ScrollViewer
            {
                MaxHeight = 660,
                MinWidth = 560,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                HorizontalScrollMode = ScrollMode.Disabled,
                Content = new TextBlock
                {
                    Text = text,
                    FontFamily = new FontFamily("Consolas"),
                    FontSize = 12,
                    TextWrapping = TextWrapping.Wrap,
                    Foreground = (Brush)Application.Current.Resources["TextBrush"],
                },
            },
        };
        dialog.Resources["ContentDialogBackground"] = surface;
        dialog.Resources["ContentDialogMaxWidth"] = 840.0;
        await dialog.ShowAsync();
    }
}
