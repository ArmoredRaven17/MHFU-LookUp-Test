using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class KitchenPage : Page
{
    public KitchenViewModel ViewModel { get; } = new();

    public KitchenPage() => InitializeComponent();
}
