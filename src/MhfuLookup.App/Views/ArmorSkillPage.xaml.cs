using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Navigation;
using MhfuLookup.App.Services;
using MhfuLookup.App.ViewModels;
using MhfuLookup.Core.Models;

namespace MhfuLookup.App.Views;

public sealed partial class ArmorSkillPage : Page
{
    public ArmorSkillViewModel ViewModel { get; } = new();

    public ArmorSkillPage() => InitializeComponent();

    // Bookmark deep-link: clear filters so the skill is in the list, then select it.
    protected override void OnNavigatedTo(NavigationEventArgs e)
    {
        base.OnNavigatedTo(e);
        if (e.Parameter is string id && ViewModel.FindById(id) is { } s)
            DispatcherQueue.TryEnqueue(() =>
            {
                ViewModel.SelectedCategory = ArmorSkillViewModel.AllSkills;
                SearchBox.Text = "";
                SkillList.SelectedItem = s;
                SkillList.ScrollIntoView(s);
            });
    }

    private void SearchBox_TextChanged(object sender, TextChangedEventArgs e) =>
        ViewModel.SearchText = SearchBox.Text;

    private void SkillList_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (SkillList.SelectedItem is Skill s)
        {
            ViewModel.Selected = s;
            SkillStar.SetTarget(Bookmarks.ArmorSkill, s.Id, s.Name);
        }
    }
}
