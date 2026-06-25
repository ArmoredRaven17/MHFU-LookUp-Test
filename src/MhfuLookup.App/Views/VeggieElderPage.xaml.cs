using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class VeggieElderPage : Page
{
    public VeggieElderViewModel ViewModel { get; } = new();

    public VeggieElderPage() => InitializeComponent();

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;
}
