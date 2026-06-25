using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Views;

public sealed partial class MonsterPage : Page
{
    public MonsterViewModel ViewModel { get; } = new();

    public MonsterPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        MonsterList.ItemsSource = cvs.View;
    }

    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string monsterId)
            SelectMonster(monsterId);
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    private void MonsterList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (MonsterList.SelectedItem is MonsterSummary m)
            SelectMonster(m.Id);
    }

    // ── Editable user notes ──
    private string? _noteMonsterId;
    private string _lastSavedNote = "";

    private void SelectMonster(string id)
    {
        SaveNote();                 // persist any pending edit to the previous monster
        ViewModel.Select(id);
        _noteMonsterId = id;
        _lastSavedNote = AppDb.Instance.GetUserNote("monster", id);
        MonsterNotesBox.Text = _lastSavedNote;   // matches saved → not dirty
        MonsterStar.SetTarget(Bookmarks.Monster, id, ViewModel.Detail?.Name ?? id);
    }

    private void SaveNote()
    {
        if (_noteMonsterId is { } id)
            AppDb.Instance.SetUserNote("monster", id, MonsterNotesBox.Text);
        _lastSavedNote = MonsterNotesBox.Text;
        NoteEditState.Dirty = false;
    }

    private void MonsterNotesBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        NoteEditState.Save = SaveNote;
        NoteEditState.Dirty = MonsterNotesBox.Text != _lastSavedNote;
    }

    private void MonsterNotesBox_LostFocus(object sender, RoutedEventArgs e) => SaveNote();
}
