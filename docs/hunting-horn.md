# Hunting Horn notes & songs

Hunting Horns play melodies determined by their three **note colours**. This feature surfaces, for
each horn, its notes and the songs those notes can play — plus a global song reference.

## Data

Two `app_meta` blobs (see [database-schema.md](database-schema.md)) drive it, parsed by
[`HuntingHornSongs`](../src/MhfuLookup.Core/Domain/HuntingHornSongs.cs) (Core, tested in
[`HuntingHornSongsTests`](../tests/MhfuLookup.Core.Tests/HuntingHornSongsTests.cs)):

- **`hh_songs`** — the 42-song catalogue: `id`, `name`, `effect`, `duration`, optional
  `encore_effect` / `encore_duration`, and `note_sequences` (each a list of note-colour letters; a
  song may have alternates, e.g. Self-Improvement is `W-W` **or** `P-P`).
- **`hh_songmap`** — note-set → playable song ids. The key is the horn's three notes **sorted,
  de-duplicated, comma-joined** (notes `P,G,A` → key `"A,G,P"`). `HuntingHornSongs.ForNotes` does this
  lookup; `HhSong.PlayableSequence` picks the alternate a given horn can actually play.

Note colours are single letters: **W**hite, **P**urple, **B**lue, **A**qua, **Y**ellow, **R**ed,
**G**reen.

## Note icons

The seven note icons live in `src/MhfuLookup.App/Assets/Notes/Note.{white,purple,blue,aqua,yellow,red,green}.png`
(loaded via the `ImageUri` converter). They were converted to PNG from the Monster Hunter Wiki
(Fandom) "Hunting Horn Sheet Music" page; the note artwork is © Capcom (attributed in the in-app
**About** screen). Letter → file mapping is in `WeaponViewModel.NoteColorName`.

## UI

- **Per-horn** — selecting a Hunting Horn shows its three note icons and the songs it can play (effect,
  duration, encore), built in `WeaponViewModel.BuildDetail` and rendered in
  [`WeaponPage.xaml`](../src/MhfuLookup.App/Views/WeaponPage.xaml). The old plain-text "Notes: P, G, A"
  row is replaced by icons for Hunting Horns (other weapon types keep their text notes).
- **Global reference** — a **Songs…** button appears in the weapon toolbar only on the Hunting Horn
  tab (the toolbar's Expand/Collapse labels were shortened so four buttons fit the 340px panel). It
  opens [`HuntingHornSongsDialog`](../src/MhfuLookup.App/Views/HuntingHornSongsDialog.cs) — every song
  with its note-sequence icons, effect, duration and encore.
