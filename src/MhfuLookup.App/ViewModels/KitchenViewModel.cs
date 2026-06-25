using System.Collections.ObjectModel;
using System.Text.RegularExpressions;
using CommunityToolkit.Mvvm.ComponentModel;
using MhfuLookup.App.Services;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

namespace MhfuLookup.App.ViewModels;

/// <summary>A Felyne Kitchen recipe: Ingredient 1 + Ingredient 2 → effect (coloured by benefit).
/// Alt drives zebra-striping of the recipe rows.</summary>
public sealed record FoodView(string Ingredient1, string Ingredient2, string Effect, Brush EffectColor, bool Alt = false);

/// <summary>One ingredient category and the specific items it covers at a chef level.</summary>
public sealed record IngredientLine(string Category, string Items);

/// <summary>A rare Felyne Whim skill (name + what it does). Alt drives zebra-striping.</summary>
public sealed record WhimSkill(string Name, string Description, bool Alt = false);

/// <summary>A page in the Kitchen picker: a chef count (1–5) or the Whim-skills page (Chefs = 0).</summary>
public sealed record ChefOption(int Chefs, string Label);

public sealed partial class KitchenViewModel : ObservableObject
{
    private const int WhimPage = 0;

    private readonly List<(int Chefs, FoodView View)> _allRecipes;
    private readonly Dictionary<int, List<IngredientLine>> _ingredients;
    private readonly List<WhimSkill> _whim;

    public List<ChefOption> ChefLevels { get; }
    public ObservableCollection<IngredientLine> Ingredients { get; } = new();
    public ObservableCollection<FoodView> Recipes { get; } = new();
    public ObservableCollection<WhimSkill> WhimSkills { get; } = new();

    [ObservableProperty] private ChefOption? selectedChef;
    [ObservableProperty] private bool showRecipes = true;
    [ObservableProperty] private bool showWhim;

    public KitchenViewModel()
    {
        _allRecipes = AppDb.Instance.GetFoodRecipes()
            .Select(f => (f.Chefs, new FoodView(f.Ingredient1, f.Ingredient2, f.Effect, EffectBrush(f.Effect))))
            .ToList();
        _ingredients = AppDb.Instance.GetFoodIngredients()
            .GroupBy(i => i.Chefs)
            .ToDictionary(g => g.Key, g => g.Select(i => new IngredientLine(i.Category, i.Items)).ToList());
        _whim = AppDb.Instance.GetFelyneWhimSkills()
            .Select(s => new WhimSkill(s.Name, s.Description)).ToList();

        ChefLevels = _allRecipes.Select(x => x.Chefs).Distinct().OrderBy(n => n)
            .Select(n => new ChefOption(n, $"{n} Felyne Chef{(n == 1 ? "" : "s")}"))
            .ToList();
        if (_whim.Count > 0) ChefLevels.Add(new ChefOption(WhimPage, "Felyne Whim Skills"));

        SelectedChef = ChefLevels.FirstOrDefault();
    }

    /// <summary>Heading for the right pane (the selected chef level or "Felyne Whim Skills").</summary>
    public string Title => SelectedChef?.Label ?? "";

    partial void OnSelectedChefChanged(ChefOption? value)
    {
        OnPropertyChanged(nameof(Title));
        Rebuild();
    }

    private static Brush EffectBrush(string effect)
    {
        var key = string.IsNullOrWhiteSpace(effect) || effect.Equals("No Effect", StringComparison.OrdinalIgnoreCase)
            ? "MutedTextBrush"
            : Regex.IsMatch(effect, @"-\d") ? "NegativeBrush" : "PositiveBrush";
        return (Brush)Application.Current.Resources[key];
    }

    private void Rebuild()
    {
        Ingredients.Clear();
        Recipes.Clear();
        WhimSkills.Clear();
        if (SelectedChef is null) return;

        if (SelectedChef.Chefs == WhimPage)
        {
            ShowRecipes = false;
            ShowWhim = true;
            var w = 0;
            foreach (var s in _whim) WhimSkills.Add(s with { Alt = w++ % 2 == 1 });
            return;
        }

        ShowWhim = false;
        ShowRecipes = true;
        var chefs = SelectedChef.Chefs;
        if (_ingredients.TryGetValue(chefs, out var legend))
            foreach (var line in legend) Ingredients.Add(line);
        var i = 0;
        foreach (var (c, v) in _allRecipes)
            if (c == chefs) Recipes.Add(v with { Alt = i++ % 2 == 1 });
    }
}
