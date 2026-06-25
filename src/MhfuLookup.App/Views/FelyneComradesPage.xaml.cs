using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App.Views;

public sealed partial class FelyneComradesPage : Page
{
    public FelyneComradesViewModel ViewModel { get; } = new();

    public FelyneComradesPage() => InitializeComponent();
}
