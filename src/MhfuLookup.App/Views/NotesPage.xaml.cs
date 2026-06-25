using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class NotesPage : Page
{
    public NotesViewModel ViewModel { get; } = new();

    public NotesPage() => InitializeComponent();

    // Old-FAQ-style title banner (plain block lettering, no artwork) for the exported notes file.
    private const string ExportBanner =
@"================================================================
     __  __  _   _  _____  _   _
    |  \/  || | | ||  ___|| | | |      L  O  O  K  U  P
    | |\/| || |_| || |_   | | | |
    | |  | ||  _  ||  _|  | |_| |      Offline Reference for
    |_|  |_||_| |_||_|     \___/       Monster Hunter Freedom
                                       Unite  (MHP2G)
================================================================";

    // ── Open the noted entity ──
    private void NavigateNote_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not FrameworkElement { Tag: NoteEntry n } || App.Window is not MainWindow mw) return;
        switch (n.EntityType)
        {
            case Bookmarks.Monster: mw.NavigateToMonster(n.EntityId); break;
            case Bookmarks.Weapon:
                if (long.TryParse(n.EntityId, out var pk)) mw.NavigateToWeapon(pk);
                break;
            case Bookmarks.ArmorSet: mw.NavigateToArmorSet(n.EntityId); break;
            case Bookmarks.Quest:
                var (slug, name, training) = Bookmarks.DecodeQuest(n.EntityId);
                mw.NavigateToQuest(slug, name, training);
                break;
        }
    }

    // ── Inline editing (auto-saves on focus-out; integrates with the unsaved-on-close prompt) ──
    private void NoteBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        if (sender is not TextBox { Tag: NoteEntry n } tb) return;
        NoteEditState.Save = () => Save(tb, n);
        NoteEditState.Dirty = tb.Text != n.Note;
    }

    private void NoteBox_LostFocus(object sender, RoutedEventArgs e)
    {
        if (sender is TextBox { Tag: NoteEntry n } tb) Save(tb, n);
    }

    private static void Save(TextBox tb, NoteEntry n)
    {
        AppDb.Instance.SetUserNote(n.EntityType, n.EntityId, tb.Text);   // blank clears it
        n.Note = tb.Text;
        NoteEditState.Dirty = false;
    }

    private void DeleteNote_Click(object sender, RoutedEventArgs e)
    {
        if (sender is not FrameworkElement { Tag: NoteEntry n }) return;
        AppDb.Instance.SetUserNote(n.EntityType, n.EntityId, "");   // empty note = delete
        NoteEditState.Dirty = false;
        ViewModel.Refresh();
    }

    // ── Export (moved here from Settings) — uses the same grouped, resolved notes shown in the tab ──
    private async void ExportNotes_Click(object sender, RoutedEventArgs e)
    {
        if (ViewModel.IsEmpty)
        {
            await new ContentDialog
            {
                Title = "No notes yet",
                Content = "You haven't added any notes to export.",
                CloseButtonText = "OK", XamlRoot = XamlRoot,
            }.ShowAsync();
            return;
        }

        // Build a simple Markdown-flavoured document, grouped by entity type.
        var sb = new StringBuilder();
        sb.AppendLine(ExportBanner);
        sb.AppendLine();
        sb.AppendLine($"My Notes  —  exported {DateTime.Now:yyyy-MM-dd HH:mm}");
        foreach (var group in ViewModel.Groups)
        {
            sb.AppendLine().AppendLine($"## {group.Header}");
            foreach (var n in group)
                sb.AppendLine().AppendLine($"### {n.Name} ({n.Category})").AppendLine(n.Note);
        }

        var picker = new Windows.Storage.Pickers.FileSavePicker
        {
            SuggestedFileName = "MHFU Notes",
            SuggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.DocumentsLibrary,
        };
        picker.FileTypeChoices.Add("Text document", new List<string> { ".txt" });
        picker.FileTypeChoices.Add("Markdown", new List<string> { ".md" });
        if (App.Window is { } window)
            WinRT.Interop.InitializeWithWindow.Initialize(
                picker, WinRT.Interop.WindowNative.GetWindowHandle(window));

        var file = await picker.PickSaveFileAsync();
        if (file is not null)
            await Windows.Storage.FileIO.WriteTextAsync(file, sb.ToString());
    }
}
