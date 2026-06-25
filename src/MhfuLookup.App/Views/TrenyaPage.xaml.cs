using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class TrenyaPage : Page
{
    public TrenyaViewModel ViewModel { get; } = new();

    public TrenyaPage()
    {
        InitializeComponent();

        // Keep the bookmark star pointed at the selected destination (selection is binding-driven).
        ViewModel.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(ViewModel.SelectedLocation)) UpdateStar();
        };
        UpdateStar();   // initial destination (set in the VM ctor before we subscribed)
    }

    // Bookmark deep-link: select the destination by name (binding updates the left list).
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string name && ViewModel.FindLocation(name) is { } l)
            DispatcherQueue.TryEnqueue(() => ViewModel.SelectedLocation = l);
    }

    private void UpdateStar()
    {
        if (ViewModel.SelectedLocation is { } l)
            TrenyaStar.SetTarget(Bookmarks.Trenya, l.Name, l.Name);
    }
}
