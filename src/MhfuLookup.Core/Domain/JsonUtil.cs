using System.Text.Json.Nodes;

namespace MhfuLookup.Core.Domain;

/// <summary>Small helpers for reading the JSON data files into a mutable DOM.</summary>
public static class JsonUtil
{
    public static JsonNode ParseFile(string path) =>
        JsonNode.Parse(File.ReadAllText(path))
        ?? throw new InvalidDataException($"empty/invalid JSON: {path}");

    public static JsonNode Parse(string json) =>
        JsonNode.Parse(json) ?? throw new InvalidDataException("empty/invalid JSON");

    /// <summary>int from a JSON node with a default, tolerant of string/number forms.</summary>
    public static int AsIntOr(this JsonNode? node, int fallback = 0)
    {
        if (node is null) return fallback;
        try { return node.GetValue<int>(); } catch { /* fall through */ }
        if (node is JsonValue v && v.TryGetValue<string>(out var s) && int.TryParse(s, out var p))
            return p;
        return fallback;
    }

    public static string AsStringOr(this JsonNode? node, string fallback = "") =>
        node is null ? fallback : (node.GetValueKind() == System.Text.Json.JsonValueKind.String
            ? node.GetValue<string>() : node.ToString());

    public static bool AsBool(this JsonNode? node, bool fallback = false)
    {
        if (node is null) return fallback;
        try { return node.GetValue<bool>(); } catch { return fallback; }
    }
}
