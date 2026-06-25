using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace MhfuLookup.Core.Domain;

/// <summary>Material name normalization. Mirrors src/material_normalizer.py.</summary>
public static partial class MaterialNormalizer
{
    [GeneratedRegex(@"^\s*\d+\s+")]
    private static partial Regex CountPrefixRegex();

    /// <summary>Remove a leading integer count: "3 Basarios Shell" -> "Basarios Shell".</summary>
    public static string StripCount(string material) =>
        CountPrefixRegex().Replace(material, "").Trim();

    /// <summary>Pull the item name from a string or {"item": "..."} drop entry.</summary>
    public static string ExtractItemName(JsonNode? entry)
    {
        switch (entry)
        {
            case null:
                return "";
            case JsonValue v when v.TryGetValue<string>(out var s):
                return s.Trim();
            case JsonObject o when o.TryGetPropertyValue("item", out var item) && item is not null:
                return item.ToString().Trim();
            default:
                return "";
        }
    }

    public static string ExtractItemName(string entry) => entry.Trim();

    /// <summary>
    /// Canonical form for indexing. Trims whitespace only — deliberately NOT fuzzy
    /// (would risk merging distinct materials).
    /// </summary>
    public static string CanonicalMaterial(string name) => name.Trim();
}
