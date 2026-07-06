using System.Text.Json.Nodes;
using MhfuLookup.Core.Models;

namespace MhfuLookup.Core.Data;

public sealed record MonsterSummary(string Id, string Name, string Type);

/// <summary>One ware Peddling Granny sells: which (rotating) inventory it's in, the item, and its price.</summary>
public sealed record PeddlingGrannyRow(string Inventory, string Item, string Price, int SortOrder);

/// <summary>One Veggie Elder trade: the zone it's offered in, the item you hand over, and the Common
/// and (optional) Rare items it can return. Rare is "" when that trade has no rare result.</summary>
public sealed record VeggieElderRow(string Zone, string Item, string Common, string Rare, int SortOrder);

/// <summary>A Felyne Comrades article section: title, prose body, and which data table (if any) belongs
/// under it — TableKind is "" | "weapons" | "skills" | "temperaments".</summary>
public sealed record ComradeSectionRow(string Title, string Body, string TableKind, int SortOrder);

/// <summary>Recommended Felyne Comrade weapon by attack-power tier (Slash vs Impact), with the
/// Weapon Divider used in the damage formula: (Attack×Hitzone×Defense×Rage×Critical) / Divider.</summary>
public sealed record ComradeWeaponRow(string AttackPower, string Slash, string Impact, string Divider, int SortOrder);

/// <summary>A trainable Felyne Comrade skill: name, point cost, what it does, and how it's unlocked.</summary>
public sealed record ComradeSkillRow(string Skill, string Cost, string Description, string Unlock, int SortOrder);

/// <summary>A Felyne Comrade temperament (personality): its attack preference, healing rate, and target.</summary>
public sealed record ComradeTemperamentRow(string Character, string AttackPref, string Healing, string Target, int SortOrder);

/// <summary>A user-saved bookmark: the entity kind, its stable id (type-specific), a cached display
/// name, and an optional cached icon uri (used where the icon can't be re-derived from name alone, e.g. quests).</summary>
public sealed record BookmarkRow(string EntityType, string EntityId, string Name, string Icon = "");

/// <summary>A user note resolved for the Notes tab: the entity kind + its id (for edit/delete/deep-link),
/// the entity's display name and category/type, and the note text.</summary>
public sealed record UserNoteRow(string EntityType, string EntityId, string Name, string Category, string Note, int Rarity = 0);

public sealed record ItemRow(
    string Category, string Name, string Icon, string Rarity, string Capacity, string Value,
    string PokkeValue, string Description);

public sealed record CombinationRow(
    string Section, string Product, string Item1, string Item2, string Pct, string Qty);

public sealed record TreasureRow(
    string Area, string Name, string Description, string WhereToFind,
    string Points, string Rarity, string Icon, bool IsAward);

public sealed record FoodRecipeRow(
    int Chefs, string Ingredient1, string Ingredient2, string Effect);

public sealed record FoodIngredientRow(int Chefs, string Category, string Items);

public sealed record FelyneWhimRow(string Name, string Description);

public sealed record TrenyaItemRow(string Location, int Points, string Category, string Item);

public sealed record PokkeItemRow(
    string Area, string GroupLabel, string GroupNote, string Item, string ItemNote);

public sealed record AwardRow(string Name, string Description, string Condition, string Icon);

public sealed record WeaponRow(
    long WeaponPk, string Id, string Type, string Name,
    int Atk, int Affinity, int Slots, int Price, string? UpgradesFrom, JsonObject Doc);

public sealed record ArmorSetSummary(
    string Id, string Name, int Rarity, bool ClassSplit, int SortOrder, string Classes);

/// <summary>One class variant of a set with its activated skills and 5 pieces.</summary>
public sealed record ArmorVariant(
    string ClassType, IReadOnlyList<string> ActivatedSkills, IReadOnlyList<ArmorPiece> Pieces);

public sealed record ArmorSetDetail(
    string Id, string Name, int Rarity, bool ClassSplit,
    IReadOnlyList<ArmorVariant> Variants);

public sealed record NamedDoc(string Slug, string Title);
