using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class BookmarksPage : Page
{
    public BookmarksViewModel ViewModel { get; } = new();

    public BookmarksPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        List.ItemsSource = cvs.View;
        // Keep the list in sync while open (e.g. when a bookmark is removed via its row's ✕).
        Bookmarks.Changed += ViewModel.Refresh;
        Unloaded += (_, _) => Bookmarks.Changed -= ViewModel.Refresh;
    }

    // Click a row → deep-link to that entity's detail view.
    private void List_ItemClick(object sender, ItemClickEventArgs e)
    {
        if (e.ClickedItem is not BookmarkEntry b || App.Window is not MainWindow mw) return;
        switch (b.Type)
        {
            case Bookmarks.Monster: mw.NavigateToMonster(b.Id); break;
            case Bookmarks.Weapon:
                if (long.TryParse(b.Id, out var pk)) mw.NavigateToWeapon(pk);
                break;
            case Bookmarks.Item: mw.NavigateToItem(b.Id); break;
            case Bookmarks.ArmorSet: mw.NavigateToArmorSet(b.Id); break;
            case Bookmarks.Decoration: mw.NavigateToDecoration(b.Id); break;
            case Bookmarks.Treasure: mw.NavigateToTreasure(b.Id); break;
            case Bookmarks.ArmorSkill: mw.NavigateToArmorSkill(b.Id); break;
            case Bookmarks.Gathering: mw.NavigateToGathering(b.Id); break;
            case Bookmarks.Trenya: mw.NavigateToTrenya(b.Id); break;
            case Bookmarks.Quest:
                var (slug, name, training) = Bookmarks.DecodeQuest(b.Id);
                mw.NavigateToQuest(slug, name, training);
                break;
        }
    }

    private void Remove_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: BookmarkEntry b })
            Bookmarks.Remove(b.Type, b.Id);   // raises Changed → ViewModel.Refresh
    }
}
