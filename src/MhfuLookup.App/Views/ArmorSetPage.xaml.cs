using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Views;

public sealed partial class ArmorSetPage : Page
{
    public ArmorSetViewModel ViewModel { get; } = new();
    private bool _ready;

    public ArmorSetPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        SetList.ItemsSource = cvs.View;
        _ready = true;
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    // Bookmark deep-link: select the set by id (and scroll it into view). A set hidden by the current
    // class/gender toggle still shows its detail directly.
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is not string setId) return;
        DispatcherQueue.TryEnqueue(() =>
        {
            var item = ViewModel.FindSummary(setId);
            if (item is not null) { SetList.SelectedItem = item; SetList.ScrollIntoView(item); }
            else
            {
                ViewModel.Select(setId);
                ArmorStar.SetTarget(Bookmarks.ArmorSet, setId, ViewModel.Selected?.Name ?? setId);
                LoadNoteFor(setId);
            }
        });
    }

    private void SetList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (SetList.SelectedItem is ArmorSetSummary s)
        {
            SaveNote();                 // persist any pending edit to the previously selected set
            ViewModel.Select(s.Id);
            ArmorStar.SetTarget(Bookmarks.ArmorSet, s.Id, s.Name);
            LoadNoteFor(s.Id);
        }
    }

    // ── Editable user notes ──
    private string? _noteSetId;
    private string _lastSavedNote = "";

    private void LoadNoteFor(string id)
    {
        _noteSetId = id;
        _lastSavedNote = AppDb.Instance.GetUserNote(Bookmarks.ArmorSet, id);
        ArmorNotesBox.Text = _lastSavedNote;   // matches saved → not dirty
    }

    private void SaveNote()
    {
        if (_noteSetId is { } id)
            AppDb.Instance.SetUserNote(Bookmarks.ArmorSet, id, ArmorNotesBox.Text);
        _lastSavedNote = ArmorNotesBox.Text;
        NoteEditState.Dirty = false;
    }

    private void ArmorNotesBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        NoteEditState.Save = SaveNote;
        NoteEditState.Dirty = ArmorNotesBox.Text != _lastSavedNote;
    }

    private void ArmorNotesBox_LostFocus(object sender, RoutedEventArgs e) => SaveNote();

    // Flipping Blademaster/Gunner or Male/Female rebuilds the list (names and membership change).
    // Capture the scroll position first, then keep the user where they were: re-select the same
    // set and scroll it into view, or restore the raw scroll offset if it's gone.
    private void Toggle_Toggled(object sender, RoutedEventArgs e)
    {
        if (!_ready) return;
        var sv = FindScrollViewer(SetList);
        var offset = sv?.VerticalOffset ?? 0;
        var id = ViewModel.CurrentSetId;

        // Ensure VM reflects both switches before rebuilding (order-independent of the binding).
        ViewModel.IsGunner = ClassSwitch.IsOn;
        ViewModel.IsFemale = GenderSwitch.IsOn;
        ViewModel.Refilter();

        DispatcherQueue.TryEnqueue(() =>
        {
            var item = ViewModel.FindSummary(id);
            if (item is not null)
            {
                SetList.SelectedItem = item;
                SetList.ScrollIntoView(item);
            }
            else
            {
                sv?.ChangeView(null, offset, null);
            }
        });
    }

    private static ScrollViewer? FindScrollViewer(DependencyObject root)
    {
        if (root is ScrollViewer sv) return sv;
        var count = VisualTreeHelper.GetChildrenCount(root);
        for (var i = 0; i < count; i++)
        {
            var found = FindScrollViewer(VisualTreeHelper.GetChild(root, i));
            if (found is not null) return found;
        }
        return null;
    }
}
