using MhfuLookup.Core.Domain;
using Xunit;

namespace MhfuLookup.Core.Tests;

public class HuntingHornSongsTests
{
    private const string SongsJson = """
    [
      { "id": "self_improvement", "name": "Self-Improvement", "effect": "Movement speed up",
        "duration": "3'", "encore_effect": "Attacks won't bounce", "encore_duration": "1'30\"",
        "note_sequences": [["W","W"],["P","P"]] },
      { "id": "attack_up_hi", "name": "Attack Up (Hi)", "effect": "Attack +15%",
        "duration": "1'30\"", "encore_effect": "Attack +20%", "encore_duration": "1'",
        "note_sequences": [["P","R","R"]] },
      { "id": "defense_up_lo", "name": "Defense Up (Lo)", "effect": "Defense +15%",
        "duration": "2'", "encore_effect": null, "encore_duration": null,
        "note_sequences": [["R","Y"]] }
    ]
    """;

    private const string MapJson = """
    { "P,R,Y": ["self_improvement", "attack_up_hi", "defense_up_lo"] }
    """;

    private static HuntingHornSongs Build() => HuntingHornSongs.Parse(SongsJson, MapJson);

    [Theory]
    [InlineData(new[] { "P", "G", "A" }, "A,G,P")]   // sorted
    [InlineData(new[] { "W", "W" }, "W")]            // de-duplicated
    [InlineData(new[] { "R", "Y", "P" }, "P,R,Y")]   // matches the map key regardless of input order
    public void NoteKey_SortsAndDedups(string[] notes, string expected) =>
        Assert.Equal(expected, HuntingHornSongs.NoteKey(notes));

    [Fact]
    public void Parse_ReadsAllFields_IncludingNullableEncore()
    {
        var s = Build().ById("self_improvement")!;
        Assert.Equal("Self-Improvement", s.Name);
        Assert.Equal("Movement speed up", s.Effect);
        Assert.Equal("Attacks won't bounce", s.EncoreEffect);
        Assert.Equal(2, s.NoteSequences.Count);
        Assert.Equal(new[] { "W", "W" }, s.NoteSequences[0]);

        var d = Build().ById("defense_up_lo")!;
        Assert.Null(d.EncoreEffect);
        Assert.Null(d.EncoreDuration);
    }

    [Fact]
    public void ForNotes_ReturnsMappedSongs_InMapOrder()
    {
        // A horn with notes P/R/Y (any input order) plays exactly the mapped songs, in map order.
        var songs = Build().ForNotes(new[] { "Y", "P", "R" });
        Assert.Equal(new[] { "self_improvement", "attack_up_hi", "defense_up_lo" },
            songs.Select(s => s.Id));
    }

    [Fact]
    public void ForNotes_UnknownNoteSet_ReturnsEmpty() =>
        Assert.Empty(Build().ForNotes(new[] { "B", "G", "W" }));

    [Fact]
    public void All_ReturnsEveryCatalogueSong() =>
        Assert.Equal(3, Build().All.Count);
}
