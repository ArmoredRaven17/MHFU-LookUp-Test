using AK.Toolkit.WinUI3;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Controls.Primitives;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App;

/// <summary>
/// Keeps a ScrollViewer's <em>own</em> scrollbar expanded (traditional, with arrows) via AK.Toolkit.
/// Needed instead of <c>ScrollBarExtensions.Keep*Expanded</c> directly for two reasons:
/// (1) AK finds the bar with a depth-first <c>FindDescendant</c>, which — when the content has nested
/// ScrollViewers (Gathering frozen-column rows, Monster/Armor wide tables) — returns a nested viewer's
/// bar instead of the owner's; (2) AK's ScrollViewer path also forces the bar's visibility to
/// <c>Visible</c>, which makes horizontal bars show even when not needed. Here we locate the owner's
/// own bar and hand that <em>ScrollBar</em> to AK (which pins a bar's expanded state without searching
/// and without touching the ScrollViewer's visibility), so:
/// <list type="bullet">
/// <item>Vertical: visibility forced Visible (always-on) + pinned expanded.</item>
/// <item>Horizontal: visibility left as authored (Auto) so the bar only appears on overflow, but it's
/// pinned expanded whenever it does appear.</item>
/// </list>
/// </summary>
public static class ScrollBarFix
{
    public static readonly DependencyProperty KeepVerticalExpandedOwnProperty =
        DependencyProperty.RegisterAttached(
            "KeepVerticalExpandedOwn", typeof(bool), typeof(ScrollBarFix),
            new PropertyMetadata(false, OnVerticalChanged));

    public static bool GetKeepVerticalExpandedOwn(DependencyObject o) => (bool)o.GetValue(KeepVerticalExpandedOwnProperty);
    public static void SetKeepVerticalExpandedOwn(DependencyObject o, bool v) => o.SetValue(KeepVerticalExpandedOwnProperty, v);

    public static readonly DependencyProperty KeepHorizontalExpandedOwnProperty =
        DependencyProperty.RegisterAttached(
            "KeepHorizontalExpandedOwn", typeof(bool), typeof(ScrollBarFix),
            new PropertyMetadata(false, OnHorizontalChanged));

    public static bool GetKeepHorizontalExpandedOwn(DependencyObject o) => (bool)o.GetValue(KeepHorizontalExpandedOwnProperty);
    public static void SetKeepHorizontalExpandedOwn(DependencyObject o, bool v) => o.SetValue(KeepHorizontalExpandedOwnProperty, v);

    private static void OnVerticalChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is not ScrollViewer sv || e.NewValue is not true) return;
        sv.VerticalScrollBarVisibility = ScrollBarVisibility.Visible;   // always-on vertical bar
        Watch(sv, Orientation.Vertical);
    }

    private static void OnHorizontalChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is not ScrollViewer sv || e.NewValue is not true) return;
        // Leave HorizontalScrollBarVisibility as authored (Auto): the bar appears only on overflow,
        // but is pinned expanded whenever it is shown.
        Watch(sv, Orientation.Horizontal);
    }

    // Try to pin the owner's own bar now and again on layout changes (the bar may not be realised
    // until content first overflows). Re-setting AK's true→true is a no-op, so this is safe to repeat.
    private static void Watch(ScrollViewer sv, Orientation orientation)
    {
        void Apply()
        {
            if (FindOwnScrollBar(sv, orientation) is ScrollBar bar)
            {
                if (orientation is Orientation.Vertical) ScrollBarExtensions.SetKeepVerticalExpanded(bar, true);
                else ScrollBarExtensions.SetKeepHorizontalExpanded(bar, true);
            }
        }
        if (sv.IsLoaded) Apply();
        sv.Loaded += (_, _) => Apply();
        sv.EffectiveViewportChanged += (_, _) => Apply();
    }

    private static ScrollBar? FindOwnScrollBar(ScrollViewer owner, Orientation orientation)
    {
        foreach (var node in Descendants(owner))
            if (node is ScrollBar bar && bar.Orientation == orientation &&
                NearestScrollViewer(bar) == owner)
                return bar;
        return null;
    }

    private static IEnumerable<DependencyObject> Descendants(DependencyObject root)
    {
        var count = VisualTreeHelper.GetChildrenCount(root);
        for (var i = 0; i < count; i++)
        {
            var child = VisualTreeHelper.GetChild(root, i);
            yield return child;
            foreach (var d in Descendants(child)) yield return d;
        }
    }

    private static ScrollViewer? NearestScrollViewer(DependencyObject o)
    {
        for (var p = VisualTreeHelper.GetParent(o); p is not null; p = VisualTreeHelper.GetParent(p))
            if (p is ScrollViewer sv) return sv;
        return null;
    }
}
