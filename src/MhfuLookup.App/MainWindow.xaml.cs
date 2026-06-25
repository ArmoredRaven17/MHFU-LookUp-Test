using System.Globalization;
using System.IO;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media.Imaging;
using MhfuLookup.App.Services;
using MhfuLookup.App.Views;

namespace MhfuLookup.App;

public sealed partial class MainWindow : Window
{
    private static readonly Dictionary<string, Type> Pages = new()
    {
        ["bookmarks"] = typeof(BookmarksPage),
        ["notes"] = typeof(NotesPage),
        ["monster"] = typeof(MonsterPage),
        ["weapon"] = typeof(WeaponPage),
        ["gathering"] = typeof(GatheringPage),
        ["items"] = typeof(ItemsPage),
        ["combolist"] = typeof(ComboListPage),
        ["treasures"] = typeof(TreasuresPage),
        ["kitchen"] = typeof(KitchenPage),
        ["trenya"] = typeof(TrenyaPage),
        ["pokke"] = typeof(PokkePage),
        ["granny"] = typeof(PeddlingGrannyPage),
        ["veggie"] = typeof(VeggieElderPage),
        ["comrades"] = typeof(FelyneComradesPage),
        ["awards"] = typeof(AwardsPage),
        ["quest"] = typeof(QuestPage),
        ["training"] = typeof(QuestPage),   // same page, locked to the Training School category
        ["decoration"] = typeof(DecorationPage),
        ["armorset"] = typeof(ArmorSetPage),
        ["armorskill"] = typeof(ArmorSkillPage),
        ["settings"] = typeof(SettingsPage),
        ["help"] = typeof(HelpPage),
        ["about"] = typeof(AboutPage),
    };

    public MainWindow()
    {
        InitializeComponent();
        Title = "MHFU LookUp";

        // Custom title bar so the app icon can be shown larger than the default chrome allows.
        ExtendsContentIntoTitleBar = true;
        SetTitleBar(AppTitleBar);

        // Appearance: apply the saved theme colour + window icon, and react to live changes.
        Appearance.ApplyColor(Appearance.ColorId);
        StyleTitleBar();
        Appearance.ColorChanged += StyleTitleBar;
        ApplyAppIcon();
        Appearance.IconChanged += ApplyAppIcon;

        Nav.SelectedItem = Nav.MenuItems[0];

        // Data-driven tab icons; re-apply when the user changes them in Settings.
        ApplyTabIcons();
        TabIcons.Changed += ApplyTabIcons;

        // Apply the persisted UI scale, and keep applying it live when it changes.
        AppScale.Changed += s => { ScaleRoot.Scale = s; ApplyMinWindowSize(); };
        var stored = AppDb.Instance.GetSetting("ui_scale");
        if (double.TryParse(stored, NumberStyles.Float, CultureInfo.InvariantCulture, out var f) && f > 0)
            AppScale.Current = f;
        ScaleRoot.Scale = AppScale.Current;

        // Constrain the window so it can't shrink below what the content needs.
        ScaleRoot.Loaded += (_, _) => ApplyMinWindowSize();

        // Prompt before closing if a note is mid-edit and not yet saved.
        if (AppWindow is not null) AppWindow.Closing += OnWindowClosing;
    }

    private bool _forceClose;

    // Intercept the window close: if the user is mid-edit on a note, offer to save / discard / cancel.
    private async void OnWindowClosing(AppWindow sender, AppWindowClosingEventArgs args)
    {
        if (_forceClose || !NoteEditState.Dirty) return;
        args.Cancel = true;   // hold the close until the user decides

        var dialog = new ContentDialog
        {
            Title = "Unsaved note",
            Content = "You have a note with unsaved changes. Save it before closing?",
            PrimaryButtonText = "Save & Close",
            SecondaryButtonText = "Discard & Close",
            CloseButtonText = "Cancel",
            DefaultButton = ContentDialogButton.Primary,
            XamlRoot = Content.XamlRoot,
        };
        var result = await dialog.ShowAsync();
        if (result == ContentDialogResult.None) return;                         // Cancel — keep open
        if (result == ContentDialogResult.Primary) NoteEditState.Save?.Invoke(); // Save
        NoteEditState.Dirty = false;
        _forceClose = true;
        Close();
    }

    // Paint the standard title bar to match the current app theme colour.
    private void StyleTitleBar()
    {
        if (!AppWindowTitleBar.IsCustomizationSupported() || AppWindow?.TitleBar is not { } tb) return;

        static Windows.UI.Color C(byte r, byte g, byte b) => Windows.UI.Color.FromArgb(255, r, g, b);
        var bg = Appearance.WindowColor;
        var fg = C(0xD4, 0xD4, 0xD4);
        var dim = C(0x80, 0x80, 0x80);
        var white = C(0xFF, 0xFF, 0xFF);
        Windows.UI.Color Lift(int d) => C((byte)Math.Min(255, bg.R + d), (byte)Math.Min(255, bg.G + d), (byte)Math.Min(255, bg.B + d));

        tb.BackgroundColor = bg;
        tb.ForegroundColor = fg;
        tb.InactiveBackgroundColor = bg;
        tb.InactiveForegroundColor = dim;

        // Title bar content is custom, so the caption buttons sit transparent over it.
        var clear = Windows.UI.Color.FromArgb(0, 0, 0, 0);
        tb.ButtonBackgroundColor = clear;
        tb.ButtonForegroundColor = fg;
        tb.ButtonInactiveBackgroundColor = clear;
        tb.ButtonInactiveForegroundColor = dim;
        tb.ButtonHoverBackgroundColor = Lift(0x18);
        tb.ButtonHoverForegroundColor = white;
        tb.ButtonPressedBackgroundColor = Lift(0x28);
        tb.ButtonPressedForegroundColor = white;
    }

    // Set the window/taskbar icon (.ico) and the larger title-bar image from the chosen monster.
    private void ApplyAppIcon()
    {
        if (AppWindow is null) return;
        var dir = Path.Combine(AppContext.BaseDirectory, "Assets", "Monsters");
        var ico = Path.Combine(dir, Appearance.IconId + ".ico");
        if (!File.Exists(ico)) ico = Path.Combine(dir, Appearance.DefaultIcon + ".ico");
        if (File.Exists(ico)) AppWindow.SetIcon(ico);

        TitleBarIcon.Source = new BitmapImage(new Uri($"ms-appx:///Assets/Monsters/{Appearance.IconId}.png"));
    }

    // Logical minimum content size (DIPs); converted to physical pixels for the presenter.
    private const double MinLogicalWidth = 980;
    private const double MinLogicalHeight = 660;

    private void ApplyMinWindowSize()
    {
        if (AppWindow?.Presenter is not OverlappedPresenter presenter) return;
        var rasterization = (Content as FrameworkElement)?.XamlRoot?.RasterizationScale ?? 1.0;
        // The UI-scale zoom enlarges content, so the window must be allowed to grow with it.
        var factor = rasterization * Math.Max(1.0, AppScale.Current);
        presenter.PreferredMinimumWidth = (int)(MinLogicalWidth * factor);
        presenter.PreferredMinimumHeight = (int)(MinLogicalHeight * factor);
    }

    /// <summary>Assign each nav item its monster icon from <see cref="TabIcons"/>.</summary>
    private void ApplyTabIcons()
    {
        foreach (var item in Nav.MenuItems.OfType<NavigationViewItem>())
            if (item.Tag is string tag)
                item.Icon = new ImageIcon { Source = new BitmapImage(TabIcons.IconUri(tag)) };
    }

    // ── Programmatic deep-linking (used by the Bookmarks tab) ─────────────────
    // Each helper highlights the matching nav item (so the pane stays in sync) then navigates the
    // frame with a page-specific parameter the target page's OnNavigatedTo re-selects from.
    private void SelectNavByTag(string tag)
    {
        foreach (var item in Nav.MenuItems.OfType<NavigationViewItem>())
            if (item.Tag as string == tag) { Nav.SelectedItem = item; return; }
    }

    public void NavigateToMonster(string monsterId)
    {
        SelectNavByTag("monster");
        ContentFrame.Navigate(typeof(MonsterPage), monsterId);
    }

    public void NavigateToWeapon(long weaponPk)
    {
        SelectNavByTag("weapon");
        ContentFrame.Navigate(typeof(WeaponPage), weaponPk);
    }

    public void NavigateToItem(string itemName)
    {
        SelectNavByTag("items");
        ContentFrame.Navigate(typeof(ItemsPage), itemName);
    }

    public void NavigateToArmorSet(string setId)
    {
        SelectNavByTag("armorset");
        ContentFrame.Navigate(typeof(ArmorSetPage), setId);
    }

    public void NavigateToDecoration(string decorationName)
    {
        SelectNavByTag("decoration");
        ContentFrame.Navigate(typeof(DecorationPage), decorationName);
    }

    public void NavigateToTreasure(string treasureName)
    {
        SelectNavByTag("treasures");
        ContentFrame.Navigate(typeof(TreasuresPage), treasureName);
    }

    public void NavigateToArmorSkill(string skillId)
    {
        SelectNavByTag("armorskill");
        ContentFrame.Navigate(typeof(ArmorSkillPage), skillId);
    }

    public void NavigateToGathering(string areaSlug)
    {
        SelectNavByTag("gathering");
        ContentFrame.Navigate(typeof(GatheringPage), areaSlug);
    }

    public void NavigateToTrenya(string location)
    {
        SelectNavByTag("trenya");
        ContentFrame.Navigate(typeof(TrenyaPage), location);
    }

    /// <summary>Deep-link a quest; training-school quests route through the Training tab.</summary>
    public void NavigateToQuest(string slug, string questName, bool training)
    {
        SelectNavByTag(training ? "training" : "quest");
        ContentFrame.Navigate(typeof(QuestPage), new QuestNavTarget(slug, questName, training));
    }

    private void Nav_SelectionChanged(NavigationView sender, NavigationViewSelectionChangedEventArgs args)
    {
        if (args.SelectedItem is NavigationViewItem { Tag: string tag } && Pages.TryGetValue(tag, out var page))
        {
            // The Training tab reuses QuestPage, showing the Training School categories.
            object? param = tag == "training" ? "training" : null;
            ContentFrame.Navigate(page, param);
        }
    }
}
