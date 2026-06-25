using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Data;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class ComboListPage : Page
{
    public CombosViewModel ViewModel { get; } = new();

    public ComboListPage()
    {
        InitializeComponent();
        var cvs = new CollectionViewSource { IsSourceGrouped = true, Source = ViewModel.Groups };
        ComboList.ItemsSource = cvs.View;
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;
}
