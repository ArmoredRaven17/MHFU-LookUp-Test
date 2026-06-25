using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

/// <summary>Deep-link target for a quest bookmark: the category slug, quest name, and training flag.</summary>
public sealed record QuestNavTarget(string Slug, string Name, bool Training);

public sealed partial class QuestPage : Page
{
    public QuestViewModel ViewModel { get; } = new();
    private readonly CollectionViewSource _cvs;

    public QuestPage()
    {
        InitializeComponent();
        _cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        QuestList.ItemsSource = _cvs.View;
    }

    // The Training tab navigates with "training" → show the Training School categories instead.
    // A bookmark navigates with a QuestNavTarget → switch to its category and select the quest.
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is "training")
        {
            ViewModel.ShowTraining();
        }
        else if (e.Parameter is QuestNavTarget t)
        {
            ViewModel.GoToCategory(t.Slug, t.Training);
            DispatcherQueue.TryEnqueue(() =>
            {
                if (ViewModel.FindQuest(t.Name) is { } q) { QuestList.SelectedItem = q; QuestList.ScrollIntoView(q); }
            });
        }
    }

    private void QuestList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (QuestList.SelectedItem is QuestItem q)
        {
            SaveNote();                 // persist any pending edit to the previously selected quest
            ViewModel.Selected = q;
            var slug = ViewModel.SelectedCategory?.Slug ?? "";
            var id = Bookmarks.EncodeQuest(slug, q.Name);
            QuestStar.SetTarget(Bookmarks.Quest, id, q.Name, QuestIcon(q));
            LoadNoteFor(id);
        }
    }

    // ── Editable user notes ──
    private string? _noteQuestId;
    private string _lastSavedNote = "";

    private void LoadNoteFor(string id)
    {
        _noteQuestId = id;
        _lastSavedNote = AppDb.Instance.GetUserNote(Bookmarks.Quest, id);
        QuestNotesBox.Text = _lastSavedNote;   // matches saved → not dirty
    }

    private void SaveNote()
    {
        if (_noteQuestId is { } id)
            AppDb.Instance.SetUserNote(Bookmarks.Quest, id, QuestNotesBox.Text);
        _lastSavedNote = QuestNotesBox.Text;
        NoteEditState.Dirty = false;
    }

    private void QuestNotesBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        NoteEditState.Save = SaveNote;
        NoteEditState.Dirty = QuestNotesBox.Text != _lastSavedNote;
    }

    private void QuestNotesBox_LostFocus(object sender, RoutedEventArgs e) => SaveNote();

    // A quest's bookmark icon: its first target monster, else its first delivery-item icon ("" if neither).
    private static string QuestIcon(QuestItem q)
    {
        if (q.TargetIds.Count > 0) return $"ms-appx:///Assets/Monsters/{q.TargetIds[0]}.png";
        if (q.TargetItemIcons.Count > 0) return $"ms-appx:///Assets/Items/{q.TargetItemIcons[0]}.png";
        return "";
    }
}
