using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App;

/// <summary>
/// Attached behaviour for inner horizontal-only ScrollViewers: the mouse wheel never scrolls the
/// inner one — a vertical wheel is forwarded to the nearest ancestor ScrollViewer so the page keeps
/// scrolling vertically when the pointer is over a wide table, and a horizontal wheel does nothing.
/// Horizontal scrolling is by dragging the scrollbar only.
///
/// The handler is attached to the ScrollViewer's <em>content</em> (which sits below the ScrollViewer
/// on the bubbling route) and marks the event handled there — before the ScrollViewer's own wheel
/// handler runs. Attaching to the ScrollViewer itself is too late: WinUI scrolls a horizontal-only
/// ScrollViewer with the vertical wheel first, producing a dual (diagonal) movement.
/// </summary>
public static class ScrollForwarder
{
    public static readonly DependencyProperty BubbleVerticalWheelProperty =
        DependencyProperty.RegisterAttached(
            "BubbleVerticalWheel", typeof(bool), typeof(ScrollForwarder),
            new PropertyMetadata(false, OnChanged));

    public static bool GetBubbleVerticalWheel(DependencyObject o) => (bool)o.GetValue(BubbleVerticalWheelProperty);
    public static void SetBubbleVerticalWheel(DependencyObject o, bool v) => o.SetValue(BubbleVerticalWheelProperty, v);

    private static void OnChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is not ScrollViewer sv || e.NewValue is not true) return;
        if (sv.IsLoaded) Hook(sv);
        else
        {
            void OnLoaded(object _, RoutedEventArgs __) { sv.Loaded -= OnLoaded; Hook(sv); }
            sv.Loaded += OnLoaded;
        }
    }

    private static void Hook(ScrollViewer sv)
    {
        // The content covers wheel-over-content (intercepted below the ScrollContentPresenter).
        if (sv.Content is UIElement content)
            content.PointerWheelChanged += (_, e) => OnWheel(sv, e);
        // The template root covers wheel over the chrome — chiefly the now-always-visible scrollbar,
        // which isn't part of Content, so a vertical wheel there would otherwise scroll it sideways.
        if (VisualTreeHelper.GetChildrenCount(sv) > 0 &&
            VisualTreeHelper.GetChild(sv, 0) is UIElement root)
            root.PointerWheelChanged += (_, e) => OnWheel(sv, e);
    }

    private static void OnWheel(ScrollViewer inner, PointerRoutedEventArgs e)
    {
        if (e.Handled) return;
        var props = e.GetCurrentPoint(inner).Properties;
        e.Handled = true;   // never let the wheel scroll the inner (horizontal) ScrollViewer
        if (props.IsHorizontalMouseWheel) return;   // a horizontal wheel does nothing here
        var parent = FindParentScrollViewer(inner);
        parent?.ChangeView(null, parent.VerticalOffset - props.MouseWheelDelta, null, disableAnimation: true);
    }

    private static ScrollViewer? FindParentScrollViewer(DependencyObject o)
    {
        for (var p = VisualTreeHelper.GetParent(o); p is not null; p = VisualTreeHelper.GetParent(p))
            if (p is ScrollViewer sv) return sv;
        return null;
    }
}
