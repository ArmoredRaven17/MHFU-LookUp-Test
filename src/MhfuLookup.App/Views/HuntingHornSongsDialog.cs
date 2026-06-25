using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Documents;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Domain;

namespace MhfuLookup.App.Views;

/// <summary>
/// Hunting Horn song reference: every melody with its note-colour sequence(s), effect, duration
/// and encore. A one-stop sheet-music lookup, independent of any specific horn. Self-contained,
/// built in code-behind like the other weapon dialogs.
/// </summary>
public sealed class HuntingHornSongsDialog : ContentDialog
{
    // Pull the app's live theme brushes so the dialog matches the chosen colour (and recolours live).
    private static Brush App(string key) => (Brush)Application.Current.Resources[key];
    private readonly Brush _text = App("TextBrush");
    private readonly Brush _muted = App("MutedTextBrush");
    private static readonly Brush Rule = new SolidColorBrush(Windows.UI.Color.FromArgb(40, 0xFF, 0xFF, 0xFF));

    public HuntingHornSongsDialog(HuntingHornSongs catalogue)
    {
        Title = "Hunting Horn Songs";
        CloseButtonText = "Close";
        DefaultButton = ContentDialogButton.Close;
        Resources["ContentDialogMaxWidth"] = 820.0;
        // Match the app theme: background/foreground/border from the live theme brushes.
        Resources["ContentDialogBackground"] = App("PanelBgOpaqueBrush");
        Resources["ContentDialogForeground"] = _text;
        Resources["ContentDialogBorderBrush"] = App("BorderBrush");
        Background = App("PanelBgOpaqueBrush");

        var list = new StackPanel { Spacing = 0, MinWidth = 520 };
        list.Children.Add(new TextBlock
        {
            Text = "Every melody and the note sequence that plays it. A horn can play a song if its "
                 + "three note colours cover one of the sequences shown.",
            Foreground = _muted, FontSize = 13, TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(0, 0, 0, 8),
        });

        var first = true;
        foreach (var s in catalogue.All)
        {
            if (!first) list.Children.Add(new Border { Height = 1, Background = Rule, Margin = new Thickness(0, 6, 0, 6) });
            first = false;
            list.Children.Add(SongRow(s));
        }

        Content = new ScrollViewer
        {
            Content = list,
            MaxHeight = 680,
            HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
            HorizontalScrollMode = ScrollMode.Disabled,
        };
    }

    private FrameworkElement SongRow(HhSong s)
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(150) });
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        // Note sequence(s) — alternates (e.g. Self-Improvement W-W or P-P) stack with an "or" label.
        var notes = new StackPanel { Spacing = 2, VerticalAlignment = VerticalAlignment.Top };
        for (var i = 0; i < s.NoteSequences.Count; i++)
        {
            if (i > 0) notes.Children.Add(new TextBlock { Text = "or", FontSize = 12, Foreground = _muted });
            notes.Children.Add(IconStrip(s.NoteSequences[i]));
        }
        Grid.SetColumn(notes, 0);
        g.Children.Add(notes);

        var txt = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        var title = new TextBlock { FontSize = 16, TextWrapping = TextWrapping.Wrap, Foreground = _text };
        title.Inlines.Add(new Run { Text = s.Name, FontWeight = Microsoft.UI.Text.FontWeights.SemiBold });
        title.Inlines.Add(new Run { Text = $" — {s.Effect} ({s.Duration})" });
        txt.Children.Add(title);
        if (s.HasEncore)
            txt.Children.Add(new TextBlock
            {
                Text = $"Encore: {s.EncoreEffect} ({s.EncoreDuration})",
                FontSize = 14, Foreground = _muted, TextWrapping = TextWrapping.Wrap,
            });
        Grid.SetColumn(txt, 1);
        g.Children.Add(txt);
        return g;
    }

    private static StackPanel IconStrip(IReadOnlyList<string> seq)
    {
        var sp = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 3 };
        foreach (var n in seq)
        {
            var uri = WeaponViewModel.NoteIconUri(n);
            if (uri.Length == 0) continue;
            sp.Children.Add(new Image { Source = new BitmapImage(new Uri(uri)), Width = 26, Height = 26 });
        }
        return sp;
    }
}
