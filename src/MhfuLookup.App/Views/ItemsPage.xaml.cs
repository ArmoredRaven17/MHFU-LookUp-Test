using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Views;

public sealed partial class ItemsPage : Page
{
    public ItemsViewModel ViewModel { get; } = new();

    public ItemsPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        ItemList.ItemsSource = cvs.View;
    }

    // Bookmark deep-link: select the named item (and scroll it into view).
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string name && ViewModel.FindByName(name) is { } row)
            DispatcherQueue.TryEnqueue(() => { ItemList.SelectedItem = row; ItemList.ScrollIntoView(row); });
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    // Jump the list to the picked category, then clear the box so it acts like a jump button
    // (re-picking the same category works, and the placeholder text stays visible).
    private void CategoryJump_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (CategoryJump.SelectedItem is ItemCategoryGroup g && g.Count > 0)
        {
            ItemList.ScrollIntoView(g[0], ScrollIntoViewAlignment.Leading);
            CategoryJump.SelectedItem = null;
        }
    }

    private void ItemList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (ItemList.SelectedItem is ItemRow item)
        {
            ViewModel.Selected = item;
            ItemStar.SetTarget(Bookmarks.Item, item.Name, item.Name);
        }
    }
}
