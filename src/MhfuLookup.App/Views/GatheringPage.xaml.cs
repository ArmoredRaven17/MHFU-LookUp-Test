using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class GatheringPage : Page
{
    public GatheringViewModel ViewModel { get; } = new();

    public GatheringPage()
    {
        InitializeComponent();

        // Keep the bookmark star pointed at the selected area (selection is binding-driven, no handler).
        ViewModel.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(ViewModel.SelectedArea)) UpdateStar();
        };
        UpdateStar();   // initial area (set in the VM ctor before we subscribed)
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    // Bookmark deep-link: select the area by slug (binding updates the left list).
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string slug && ViewModel.FindArea(slug) is { } a)
            DispatcherQueue.TryEnqueue(() => ViewModel.SelectedArea = a);
    }

    private void UpdateStar()
    {
        if (ViewModel.SelectedArea is { } a)
            GatherStar.SetTarget(Bookmarks.Gathering, a.Slug, a.Title);
    }
}
