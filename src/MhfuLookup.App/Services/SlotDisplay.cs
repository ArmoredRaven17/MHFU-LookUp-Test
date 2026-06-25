namespace MhfuLookup.App.Services;

/// <summary>Shared formatting for decoration slots.</summary>
public static class SlotDisplay
{
    /// <summary>Fixed three-character slot bar — O = a slot, - = none. 0→"---", 1→"O--", 2→"OO-", 3→"OOO".</summary>
    public static string Bar(int slots)
    {
        var n = System.Math.Clamp(slots, 0, 3);
        return new string('O', n) + new string('-', 3 - n);
    }
}
