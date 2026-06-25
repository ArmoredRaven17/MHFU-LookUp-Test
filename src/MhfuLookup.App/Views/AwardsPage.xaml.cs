using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class AwardsPage : Page
{
    public AwardsViewModel ViewModel { get; } = new();

    public AwardsPage() => InitializeComponent();

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;
}
