using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Views;

public sealed partial class WeaponPage : Page
{
    public WeaponViewModel ViewModel { get; } = new();

    // The bow the user last selected, so Compare can preselect it (null when none / not a bow).
    private WeaponRow? _selectedWeapon;

    public WeaponPage()
    {
        InitializeComponent();
        ViewModel.TreeRebuilt += RebuildNodes;
        ViewModel.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(ViewModel.SelectedType)) UpdateToolButtons();
        };
        RebuildNodes();
        UpdateToolButtons();
    }

    // Type-specific reference buttons: Sharpness… on blademaster, Songs… on Hunting Horns, Ammo… on the bowguns.
    private void UpdateToolButtons()
    {
        var t = ViewModel.SelectedType;
        // Blademaster = every melee type (has a sharpness bar); gunners (Bow / bowguns) don't.
        var gunner = t is "Bow" or "Light Bowgun" or "Heavy Bowgun";
        SharpnessButton.Visibility = gunner ? Visibility.Collapsed : Visibility.Visible;
        SongsButton.Visibility = t == "Hunting Horn" ? Visibility.Visible : Visibility.Collapsed;
        AmmoButton.Visibility = t is "Light Bowgun" or "Heavy Bowgun" ? Visibility.Visible : Visibility.Collapsed;
        ShotTypesButton.Visibility = t == "Bow" ? Visibility.Visible : Visibility.Collapsed;
        ShellsButton.Visibility = t == "Gunlance" ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void Sharpness_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new SharpnessDialog { XamlRoot = Content.XamlRoot };
        await dialog.ShowAsync();
    }

    private async void Songs_Click(object sender, RoutedEventArgs e)
    {
        var catalogue = WeaponViewModel.SongCatalogue;
        if (catalogue is null) return;
        var dialog = new HuntingHornSongsDialog(catalogue) { XamlRoot = Content.XamlRoot };
        await dialog.ShowAsync();
    }

    private async void Ammo_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new BowgunAmmoDialog { XamlRoot = Content.XamlRoot };
        await dialog.ShowAsync();
    }

    private async void ShotTypes_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new BowShotTypesDialog { XamlRoot = Content.XamlRoot };
        await dialog.ShowAsync();
    }

    private async void Shells_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new GunlanceShellsDialog { XamlRoot = Content.XamlRoot };
        await dialog.ShowAsync();
    }

    // Rebuild the unbound TreeView nodes from the view model's forest (default expanded).
    // If a cross-type navigation was pending, consume it and select the target after layout.
    private void RebuildNodes()
    {
        Tree.RootNodes.Clear();
        foreach (var root in ViewModel.Roots)
            Tree.RootNodes.Add(MakeNode(root));
        if (ViewModel.ConsumePendingNav() is { } name)
            DispatcherQueue.TryEnqueue(() => { if (IsLoaded) SelectAndShowByName(name); });
    }

    private static TreeViewNode MakeNode(WeaponNode wn)
    {
        var node = new TreeViewNode { Content = wn, IsExpanded = true };
        foreach (var child in wn.Children)
            node.Children.Add(MakeNode(child));
        return node;
    }

    private async void SearchBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        // Hidden "compare" Easter egg: typing it in the search box opens the bow comparison modal.
        // Only active on the Bow tab; on any other weapon type "compare" is just a normal search term.
        if (ViewModel.SelectedType == "Bow"
            && string.Equals(SearchBox.Text.Trim(), "compare", StringComparison.OrdinalIgnoreCase))
        {
            SearchBox.Text = "";   // reset the search (and avoid re-triggering)
            await OpenCompare();
            return;
        }
        ViewModel.SearchText = SearchBox.Text;
    }

    private bool _compareOpen;

    private async System.Threading.Tasks.Task OpenCompare()
    {
        if (_compareOpen) return;   // guard against re-entrancy while the modal is up
        var bows = AppDb.Instance.GetWeaponsByType("Bow");
        if (bows.Count == 0) return;
        var preselect = _selectedWeapon is { Type: "Bow" } ? _selectedWeapon : null;
        _compareOpen = true;
        try
        {
            var dialog = new BowCompareDialog(bows, preselect) { XamlRoot = Content.XamlRoot };
            await dialog.ShowAsync();
        }
        finally { _compareOpen = false; }
    }

    // Bookmark deep-link: switch to the weapon's type, show its detail, and select its tree node.
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is not long pk) return;
        var w = AppDb.Instance.GetWeaponByPk(pk);
        if (w is null) return;
        ViewModel.SelectedType = w.Type;   // triggers tree rebuild for that type (no-op if unchanged)
        var row = ViewModel.FindInCurrent(pk) ?? w;
        ViewModel.SelectByRow(row);
        _selectedWeapon = row;
        LoadNoteFor(row.WeaponPk);
        WeaponStar.SetTarget(Bookmarks.Weapon, row.WeaponPk.ToString(), row.Name, WeaponTypeIcon(row));
        DispatcherQueue.TryEnqueue(() => SelectTreeNode(pk));
    }

    // The weapon's rarity-coloured type icon for its bookmark (shared with the Notes tab).
    private static string WeaponTypeIcon(WeaponRow w) => WeaponTypeIcons.ForRarity(w.Type, RarityOf(w));

    private static int RarityOf(WeaponRow w)
    {
        var node = w.Doc["rarity"];
        if (node is null) return 0;
        try { return node.GetValue<int>(); } catch { }
        return int.TryParse(node.ToString(), out var v) ? v : 0;
    }

    // Best-effort: find and highlight the tree node for a weapon pk (the forest is fully built).
    private void SelectTreeNode(long pk)
    {
        var node = FindNode(Tree.RootNodes, pk);
        if (node is not null) Tree.SelectedNode = node;
    }

    private static TreeViewNode? FindNode(IList<TreeViewNode> nodes, long pk)
    {
        foreach (var n in nodes)
        {
            if ((n.Content as WeaponNode)?.Weapon?.WeaponPk == pk) return n;
            var found = FindNode(n.Children, pk);
            if (found is not null) return found;
        }
        return null;
    }

    private void Tree_ItemInvoked(TreeView sender, TreeViewItemInvokedEventArgs args)
    {
        var node = (args.InvokedItem as TreeViewNode)?.Content as WeaponNode
                   ?? args.InvokedItem as WeaponNode;
        if (node is not null)
        {
            // Navigable cross-type nodes (teal italic) jump to the target weapon in its own tree.
            // Deferred: NavigateTo clears Tree.RootNodes; doing that synchronously inside ItemInvoked
            // corrupts the TreeView's internal event iterator and causes a crash.
            if (node.CrossType is { } ct && node.CrossName is { } cn)
            {
                DispatcherQueue.TryEnqueue(() => ViewModel.NavigateTo(ct, cn));
                return;
            }
            ViewModel.Select(node);
            _selectedWeapon = node.Weapon;
            if (node.Weapon is { } w) { LoadNoteFor(w.WeaponPk); WeaponStar.SetTarget(Bookmarks.Weapon, w.WeaponPk.ToString(), w.Name, WeaponTypeIcon(w)); }
            else WeaponStar.SetTarget(Bookmarks.Weapon, null, "");   // non-navigable external row → hide star
        }
    }

    // Find the tree node whose WeaponNode.Name matches and select + show its detail.
    private void SelectAndShowByName(string name)
    {
        var treeNode = FindNodeByName(Tree.RootNodes, name);
        if (treeNode is null) return;
        Tree.SelectedNode = treeNode;
        if ((treeNode.Content as WeaponNode)?.Weapon is { } w)
        {
            ViewModel.SelectByRow(w);
            _selectedWeapon = w;
            LoadNoteFor(w.WeaponPk);
            WeaponStar.SetTarget(Bookmarks.Weapon, w.WeaponPk.ToString(), w.Name, WeaponTypeIcon(w));
        }
    }

    private static TreeViewNode? FindNodeByName(IList<TreeViewNode> nodes, string name)
    {
        foreach (var n in nodes)
        {
            var wn = n.Content as WeaponNode;
            if (wn?.Weapon is not null && wn.Name == name) return n;
            var found = FindNodeByName(n.Children, name);
            if (found is not null) return found;
        }
        return null;
    }

    // ── Editable user notes ──
    private long? _noteWeaponPk;
    private string _lastSavedNote = "";

    private void LoadNoteFor(long pk)
    {
        SaveNote();                 // persist any pending edit to the previous weapon
        _noteWeaponPk = pk;
        _lastSavedNote = AppDb.Instance.GetUserNote("weapon", pk.ToString());
        WeaponNotesBox.Text = _lastSavedNote;   // matches saved → not dirty
    }

    private void SaveNote()
    {
        if (_noteWeaponPk is { } pk)
            AppDb.Instance.SetUserNote("weapon", pk.ToString(), WeaponNotesBox.Text);
        _lastSavedNote = WeaponNotesBox.Text;
        NoteEditState.Dirty = false;
    }

    private void WeaponNotesBox_TextChanged(object sender, TextChangedEventArgs e)
    {
        NoteEditState.Save = SaveNote;
        NoteEditState.Dirty = WeaponNotesBox.Text != _lastSavedNote;
    }

    private void WeaponNotesBox_LostFocus(object sender, RoutedEventArgs e) => SaveNote();

    // The full node tree is built eagerly, so a single recursive pass expands everything.
    // Deep-link a crafting material to its Items (or Treasures) tab entry.
    private void MaterialLink_Click(object sender, RoutedEventArgs e)
    {
        if (sender is FrameworkElement { DataContext: MaterialItem mi } && mi.LinkName.Length > 0 && App.Window is MainWindow mw)
        {
            if (mi.LinkIsTreasure) mw.NavigateToTreasure(mi.LinkName);
            else mw.NavigateToItem(mi.LinkName);
        }
    }

    private void ExpandAll_Click(object sender, RoutedEventArgs e) => SetAll(Tree.RootNodes, true);
    private void CollapseAll_Click(object sender, RoutedEventArgs e) => SetAll(Tree.RootNodes, false);

    private static void SetAll(IList<TreeViewNode> nodes, bool expanded)
    {
        foreach (var n in nodes)
        {
            n.IsExpanded = expanded;
            SetAll(n.Children, expanded);
        }
    }

    private async void Filter_Click(object sender, RoutedEventArgs e)
    {
        var dialog = new WeaponFilterDialog(ViewModel.Filter, ViewModel.SelectedType ?? "")
        {
            XamlRoot = Content.XamlRoot,
        };
        var result = await dialog.ShowAsync();
        if (result == ContentDialogResult.Primary)
            ViewModel.ApplyFilter(dialog.Result);
        else if (result == ContentDialogResult.Secondary)
            ViewModel.ApplyFilter(new WeaponFilter());   // Clear All

        FilterButton.Content = ViewModel.Filter.IsActive ? "Filter ●" : "Filter…";
    }
}
