using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Views;

public sealed partial class TreasuresPage : Page
{
    public TreasuresViewModel ViewModel { get; } = new();

    public TreasuresPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        TreasureList.ItemsSource = cvs.View;
    }

    // Bookmark deep-link: select the named treasure (and scroll it into view).
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string name && ViewModel.FindByName(name) is { } row)
            DispatcherQueue.TryEnqueue(() => { TreasureList.SelectedItem = row; TreasureList.ScrollIntoView(row); });
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    private void TreasureList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (TreasureList.SelectedItem is TreasureRow t)
        {
            ViewModel.Selected = t;
            TreasureStar.SetTarget(Bookmarks.Treasure, t.Name, t.Name);
        }
    }
}
