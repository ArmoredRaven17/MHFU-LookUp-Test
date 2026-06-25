using System.Text.Json.Nodes;

namespace MhfuLookup.Core.Domain;

/// <summary>
/// One Hunting Horn melody: its effect and duration, optional encore, and the note-colour
/// sequence(s) that play it. Note colours are single letters (W P B A Y R G).
/// </summary>
public sealed record HhSong(
    string Id,
    string Name,
    string Effect,
    string Duration,
    string? EncoreEffect,
    string? EncoreDuration,
    IReadOnlyList<IReadOnlyList<string>> NoteSequences)
{
    public bool HasEncore => !string.IsNullOrEmpty(EncoreEffect);

    /// <summary>
    /// The note sequence a horn with <paramref name="notes"/> would actually play — the first
    /// sequence whose colours are all available on the horn (a song can have alternates, e.g.
    /// Self-Improvement is W-W or P-P). Falls back to the first sequence if none fits.
    /// </summary>
    public IReadOnlyList<string> PlayableSequence(ISet<string> notes)
    {
        foreach (var seq in NoteSequences)
            if (seq.All(notes.Contains)) return seq;
        return NoteSequences.Count > 0 ? NoteSequences[0] : Array.Empty<string>();
    }
}

/// <summary>
/// The Hunting Horn song catalogue (from <c>app_meta.hh_songs</c>) plus the note-set → songs map
/// (<c>app_meta.hh_songmap</c>). A horn's playable songs are looked up by the comma-joined,
/// sorted, distinct set of its three note colours (e.g. notes P,G,A → key "A,G,P").
/// </summary>
public sealed class HuntingHornSongs
{
    private readonly Dictionary<string, HhSong> _byId;
    private readonly Dictionary<string, IReadOnlyList<string>> _byNoteKey;

    /// <summary>All songs, in catalogue order.</summary>
    public IReadOnlyList<HhSong> All { get; }

    private HuntingHornSongs(IReadOnlyList<HhSong> all, Dictionary<string, IReadOnlyList<string>> byNoteKey)
    {
        All = all;
        _byId = all.ToDictionary(s => s.Id);
        _byNoteKey = byNoteKey;
    }

    /// <summary>The lookup key for a note set: sorted, de-duplicated, comma-joined (e.g. "A,G,P").</summary>
    public static string NoteKey(IEnumerable<string> notes) =>
        string.Join(",", notes.Where(n => !string.IsNullOrEmpty(n))
                               .Distinct().OrderBy(n => n, StringComparer.Ordinal));

    public HhSong? ById(string id) => _byId.TryGetValue(id, out var s) ? s : null;

    /// <summary>Songs a horn with these notes can play, in the map's order (empty if the set is unknown).</summary>
    public IReadOnlyList<HhSong> ForNotes(IEnumerable<string> notes)
    {
        if (!_byNoteKey.TryGetValue(NoteKey(notes), out var ids)) return Array.Empty<HhSong>();
        return ids.Select(ById).Where(s => s is not null).Select(s => s!).ToList();
    }

    public static HuntingHornSongs Parse(string songsJson, string songMapJson)
    {
        var songs = new List<HhSong>();
        if (JsonNode.Parse(songsJson) is JsonArray arr)
            foreach (var n in arr.OfType<JsonObject>())
                songs.Add(new HhSong(
                    Str(n["id"]), Str(n["name"]), Str(n["effect"]), Str(n["duration"]),
                    NullableStr(n["encore_effect"]), NullableStr(n["encore_duration"]),
                    ReadSequences(n["note_sequences"])));

        var map = new Dictionary<string, IReadOnlyList<string>>();
        if (JsonNode.Parse(songMapJson) is JsonObject obj)
            foreach (var (key, val) in obj)
                if (val is JsonArray ids)
                    map[key] = ids.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0).ToList();

        return new HuntingHornSongs(songs, map);
    }

    private static List<IReadOnlyList<string>> ReadSequences(JsonNode? node)
    {
        var outp = new List<IReadOnlyList<string>>();
        if (node is JsonArray seqs)
            foreach (var seq in seqs.OfType<JsonArray>())
                outp.Add(seq.Select(x => x?.ToString() ?? "").Where(s => s.Length > 0).ToList());
        return outp;
    }

    private static string Str(JsonNode? n) => n?.ToString() ?? "";
    private static string? NullableStr(JsonNode? n) => n is null ? null : n.ToString();
}
