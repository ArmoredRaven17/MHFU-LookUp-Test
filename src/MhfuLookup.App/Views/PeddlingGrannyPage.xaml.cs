using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class PeddlingGrannyPage : Page
{
    public PeddlingGrannyViewModel ViewModel { get; } = new();

    public PeddlingGrannyPage() => InitializeComponent();
}
