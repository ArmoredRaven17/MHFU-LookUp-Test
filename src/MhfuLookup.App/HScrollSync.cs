using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;

namespace MhfuLookup.App;

/// <summary>
/// Keeps a set of horizontal ScrollViewers locked to a shared horizontal offset, identified by a
/// group key. Used by the Gathering table to freeze the first columns: every data row owns its own
/// horizontal ScrollViewer (so the frozen cells share each row's height), and they all scroll
/// together with the header's scrollbar.
/// </summary>
public static class HScrollSync
{
    private sealed class Group
    {
        public double Offset;
        public bool Busy;
        public readonly List<ScrollViewer> Members = new();
    }

    private static readonly Dictionary<string, Group> Groups = new();

    public static readonly DependencyProperty GroupProperty =
        DependencyProperty.RegisterAttached(
            "Group", typeof(string), typeof(HScrollSync), new PropertyMetadata(null, OnGroupChanged));

    public static string GetGroup(DependencyObject o) => (string)o.GetValue(GroupProperty);
    public static void SetGroup(DependencyObject o, string v) => o.SetValue(GroupProperty, v);

    private static void OnGroupChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is not ScrollViewer sv || e.NewValue is not string key) return;
        if (!Groups.TryGetValue(key, out var g)) Groups[key] = g = new Group();

        sv.Loaded += (_, _) =>
        {
            if (!g.Members.Contains(sv)) g.Members.Add(sv);
            if (g.Offset > 0) sv.ChangeView(g.Offset, null, null, disableAnimation: true);
        };
        sv.Unloaded += (_, _) => g.Members.Remove(sv);
        sv.ViewChanged += (_, _) =>
        {
            if (g.Busy || Math.Abs(sv.HorizontalOffset - g.Offset) < 0.5) return;
            g.Busy = true;
            g.Offset = sv.HorizontalOffset;
            foreach (var m in g.Members)
                if (!ReferenceEquals(m, sv))
                    m.ChangeView(g.Offset, null, null, disableAnimation: true);
            g.Busy = false;
        };
    }
}
