using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class PokkePage : Page
{
    public PokkeViewModel ViewModel { get; } = new();

    public PokkePage() => InitializeComponent();
}
