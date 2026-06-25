namespace MhfuLookup.App.Services;

/// <summary>
/// White / rarity-coloured weapon-type icons (from monsterhunterwiki.org MH2 Equipment Icons,
/// CC BY-SA; art © Capcom), under Assets/WeaponTypes/. Shared by the weapon page (bookmark stars)
/// and the Notes tab.
/// </summary>
public static class WeaponTypeIcons
{
    // App weapon type → icon basename.
    private static readonly Dictionary<string, string> Names = new()
    {
        ["Great Sword"] = "Great_Sword", ["Long Sword"] = "Long_Sword",
        ["Sword & Shield"] = "Sword_and_Shield", ["Dual Blades"] = "Dual_Blades",
        ["Hammer"] = "Hammer", ["Hunting Horn"] = "Hunting_Horn",
        ["Lance"] = "Lance", ["Gunlance"] = "Gunlance",
        ["Light Bowgun"] = "Light_Bowgun", ["Heavy Bowgun"] = "Heavy_Bowgun", ["Bow"] = "Bow",
    };

    /// <summary>The white base silhouette for a weapon type ("" if unknown).</summary>
    public static string Base(string type) =>
        Names.TryGetValue(type, out var n) ? $"ms-appx:///Assets/WeaponTypes/{n}.png" : "";

    /// <summary>The rarity-coloured icon for a weapon type (rarities 1–3 share the Rare-1 icon, as
    /// in-game); an unknown rarity falls back to the white base silhouette.</summary>
    public static string ForRarity(string type, int rarity)
    {
        if (!Names.TryGetValue(type, out var n)) return "";
        if (rarity <= 0) return $"ms-appx:///Assets/WeaponTypes/{n}.png";
        var tier = rarity >= 4 ? Math.Min(rarity, 10) : 1;
        return $"ms-appx:///Assets/WeaponTypes/{n}_R{tier}.png";
    }
}
