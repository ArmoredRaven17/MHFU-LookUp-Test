using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using MhfuLookup.App.ViewModels;

namespace MhfuLookup.App;

/// <summary>Picks the DataTemplate for a parsed prose block (paragraph / sub-header / table).</summary>
public partial class ProseBlockTemplateSelector : DataTemplateSelector
{
    public DataTemplate? Paragraph { get; set; }
    public DataTemplate? Header { get; set; }
    public DataTemplate? Table { get; set; }

    protected override DataTemplate? SelectTemplateCore(object item) => item switch
    {
        ProseHeader => Header,
        ProseTable => Table,
        _ => Paragraph,
    };

    protected override DataTemplate? SelectTemplateCore(object item, DependencyObject container) =>
        SelectTemplateCore(item);
}
