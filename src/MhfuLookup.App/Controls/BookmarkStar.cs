using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using MhfuLookup.App.Services;

namespace MhfuLookup.App.Controls;

/// <summary>
/// A bookmark toggle that bookmarks the entity it currently points at. Detail pages call
/// <see cref="SetTarget"/> from their selection handler; it shows the red bookmark icon when the
/// entity is bookmarked and a grey outline otherwise, hides itself when there is no target, and
/// stays in sync with <see cref="Bookmarks.Changed"/> (e.g. when removed from the Bookmarks tab).
/// </summary>
public sealed class BookmarkStar : Button
{
    private static readonly BitmapImage OnIcon = new(new Uri("ms-appx:///Assets/Misc/bookmark_on.png"));
    private static readonly BitmapImage OffIcon = new(new Uri("ms-appx:///Assets/Misc/bookmark_off.png"));

    private readonly Image _image = new() { Width = 24, Height = 24, Stretch = Stretch.Uniform };

    private string _type = "";
    private string? _id;
    private string _name = "";
    private string _icon = "";

    public BookmarkStar()
    {
        Content = _image;
        Background = new SolidColorBrush(Windows.UI.Color.FromArgb(0, 0, 0, 0));
        BorderThickness = new Thickness(0);
        Padding = new Thickness(6, 0, 6, 2);
        VerticalAlignment = VerticalAlignment.Center;
        Click += OnClick;
        Loaded += (_, _) => { Bookmarks.Changed += Refresh; Refresh(); };
        Unloaded += (_, _) => Bookmarks.Changed -= Refresh;
    }

    /// <summary>Point the star at an entity (null/empty id hides it — e.g. nothing selected). An
    /// optional icon uri is cached on the bookmark for types whose icon can't be re-derived (quests).</summary>
    public void SetTarget(string type, string? id, string name, string icon = "")
    {
        _type = type;
        _id = id;
        _name = name;
        _icon = icon;
        Refresh();
    }

    private void Refresh()
    {
        if (string.IsNullOrEmpty(_id))
        {
            Visibility = Visibility.Collapsed;
            return;
        }
        Visibility = Visibility.Visible;
        var on = Bookmarks.Contains(_type, _id);
        _image.Source = on ? OnIcon : OffIcon;
        ToolTipService.SetToolTip(this, on ? "Remove bookmark" : "Add bookmark");
    }

    private void OnClick(object sender, RoutedEventArgs e)
    {
        if (string.IsNullOrEmpty(_id)) return;
        Bookmarks.Toggle(_type, _id, _name, _icon);   // raises Changed → Refresh
    }
}
