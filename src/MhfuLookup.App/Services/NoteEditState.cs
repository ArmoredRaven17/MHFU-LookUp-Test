namespace MhfuLookup.App.Services;

/// <summary>
/// Tracks whether the note text box currently being edited has changes that haven't been
/// persisted yet. Notes normally save on focus-out / selection change; this lets the app prompt
/// before closing if the user is mid-edit. Only one note box is active at a time, so a single
/// static slot suffices.
/// </summary>
public static class NoteEditState
{
    /// <summary>True when the active note box holds text not yet written to the database.</summary>
    public static bool Dirty { get; set; }

    /// <summary>Persists the active note box (set by whichever page owns the box).</summary>
    public static Action? Save { get; set; }
}
