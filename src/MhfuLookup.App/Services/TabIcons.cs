using System.Text.Json.Nodes;

namespace MhfuLookup.App.Services;

/// <summary>
/// Per-tab monster icon assignments. Persisted as a JSON map in the settings table
/// (key "tab_icons"); each nav tab maps to one monster id, with no repeats enforced
/// by the Settings UI.
/// </summary>
public static class TabIcons
{
    public const string SettingKey = "tab_icons";

    /// <summary>Tabs in nav order (tag must match MainWindow's NavigationViewItem tags).</summary>
    public static readonly (string Tag, string Title)[] Tabs =
    {
        ("bookmarks", "Bookmarks"),
        ("notes", "Notes"),
        ("monster", "Monsters"),
        ("weapon", "Weapons"),
        ("armorset", "Armor Sets"),
        ("armorskill", "Armor Skills"),
        ("decoration", "Decorations"),
        ("quest", "Quests"),
        ("training", "Training School"),
        ("gathering", "Gathering"),
        ("items", "Items"),
        ("combolist", "Combo List"),
        ("treasures", "Treasures"),
        ("kitchen", "Kitchen"),
        ("trenya", "Trenya"),
        ("pokke", "Pokke Farm"),
        ("granny", "Peddling Granny"),
        ("veggie", "Veggie Elder"),
        ("comrades", "Felyne Comrades"),
        ("awards", "Awards"),
        ("settings", "Settings"),
        ("help", "Help"),
        ("about", "About"),
    };

    private static readonly Dictionary<string, string> Defaults = new()
    {
        ["bookmarks"] = "anteka",
        ["notes"] = "remobra",
        ["monster"] = "tigrex",
        ["weapon"] = "rathalos",
        ["armorset"] = "rathian",
        ["armorskill"] = "daimyo_hermitaur",
        ["decoration"] = "great_thunderbug",
        ["quest"] = "yian_kut_ku",
        ["training"] = "diablos",
        ["gathering"] = "kelbi",
        ["items"] = "melynx",
        ["combolist"] = "congalala",
        ["treasures"] = "bulldrome",
        ["kitchen"] = "mosswine",
        ["trenya"] = "plesioth",
        ["pokke"] = "basarios",
        ["granny"] = "gypceros",
        ["veggie"] = "shakalaka",
        ["comrades"] = "felyne",
        ["awards"] = "kirin",
        ["settings"] = "hypnocatrice",
        ["help"] = "felyne",
        ["about"] = "fatalis",
    };

    private static Dictionary<string, string>? _map;

    /// <summary>Raised when an assignment changes, so the nav can refresh live.</summary>
    public static event Action? Changed;

    public static Dictionary<string, string> Map
    {
        get
        {
            if (_map is not null) return _map;
            _map = new Dictionary<string, string>(Defaults);
            var raw = AppDb.Instance.GetSetting(SettingKey);
            if (!string.IsNullOrWhiteSpace(raw))
            {
                try
                {
                    if (JsonNode.Parse(raw) is JsonObject obj)
                        foreach (var kv in obj)
                            if (kv.Value is not null) _map[kv.Key] = kv.Value.ToString();
                }
                catch { /* malformed → keep defaults */ }
            }
            return _map;
        }
    }

    public static string Get(string tag) => Map.TryGetValue(tag, out var id) ? id : "rathalos";

    public static Uri IconUri(string tag) => new($"ms-appx:///Assets/Monsters/{Get(tag)}.png");

    public static void Set(string tag, string monsterId)
    {
        Map[tag] = monsterId;
        Persist();
    }

    /// <summary>Reset every tab back to its built-in default icon (persists + refreshes the nav).</summary>
    public static void ResetToDefaults()
    {
        _map = new Dictionary<string, string>(Defaults);
        Persist();
    }

    private static void Persist()
    {
        var obj = new JsonObject();
        foreach (var kv in Map) obj[kv.Key] = kv.Value;
        AppDb.Instance.SetSetting(SettingKey, obj.ToJsonString());
        Changed?.Invoke();
    }
}
