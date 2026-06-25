using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class DecorationPage : Page
{
    public DecorationViewModel ViewModel { get; } = new();

    public DecorationPage() => InitializeComponent();

    // Bookmark deep-link: select the named decoration (and scroll it into view).
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string name && ViewModel.FindByName(name) is { } d)
            DispatcherQueue.TryEnqueue(() => { DecoList.SelectedItem = d; DecoList.ScrollIntoView(d); });
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    private void DecoList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (DecoList.SelectedItem is DecorationView d)
        {
            ViewModel.Selected = d;
            DecoStar.SetTarget(Bookmarks.Decoration, d.Name, d.Name);
        }
    }
}
