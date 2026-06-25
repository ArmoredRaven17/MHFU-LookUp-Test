# Deploying

MHFU LookUp is an **unpackaged WinUI 3** app (`WindowsPackageType=None`) — there's no MSIX/Store
install. You publish it to a folder, ZIP that folder, and the user unzips and runs
`MhfuLookup.App.exe`. No installer required.

## Build a portable release (recommended)

Release builds for a specific runtime identifier are **fully self-contained**: the
[`MhfuLookup.App.csproj`](../src/MhfuLookup.App/MhfuLookup.App.csproj) sets `SelfContained` **and**
`WindowsAppSDKSelfContained` for `Configuration=Release` + a RID, so both the .NET runtime and the Windows
App SDK are bundled. A plain publish is all you need:

```powershell
# x64 (the usual target)
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x64
```

Output folder:

```
src/MhfuLookup.App/bin/Release/net8.0-windows10.0.19041.0/win-x64/publish/
```

That folder is self-contained — `MhfuLookup.App.exe`, the bundled runtimes, `mhfu.db`, and all
`Assets/` icons. **Copy or ZIP it and it runs on a clean machine with nothing pre-installed.**

Other architectures (the project also targets these RIDs):

```powershell
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-arm64
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x86
```

## Target requirements

- **Windows 10 1809 (build 17763) or newer** (`TargetPlatformMinVersion`), matching the RID's architecture.
- With the self-contained publish above: **nothing else** — no .NET runtime, no Windows App SDK runtime.

## What ships automatically

The publish output already contains everything the app needs at runtime:

- `mhfu.db` — bundled as content (`PreserveNewest`); resolved at startup by
  [`Services/AppDb.cs`](../src/MhfuLookup.App/Services/AppDb.cs).
- All icon assets — `Assets/Monsters`, `Items`, `Locations`, `Decorations`, `Materials`, `Awards`.
- The app/window icon (`Assets/app.ico`) and `app.manifest`.

If you change the game data, **rebuild the database first** so the fresh `mhfu.db` is the one that gets
published:

```powershell
dotnet run --project src/MhfuLookup.DataMigration -c Debug
```

## Framework-dependent build (smaller, needs prerequisites)

If you'd rather ship a much smaller folder and the target machine can install runtimes, opt out of
self-contained at publish time:

```powershell
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x64 `
  -p:SelfContained=false -p:WindowsAppSDKSelfContained=false
```

The target then needs both:

- **.NET 8 Desktop Runtime** (x64) — <https://dotnet.microsoft.com/download/dotnet/8.0>
- **Windows App SDK 2.2 Runtime** — <https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads>

## Gotchas

- **Unsigned binary.** Windows SmartScreen will warn on first run ("Windows protected your PC" →
  *More info* → *Run anyway*). To remove the warning, sign `MhfuLookup.App.exe` with a code-signing
  certificate (`signtool sign /fd SHA256 /a MhfuLookup.App.exe`).
- **Match the architecture.** An ARM64 or 32-bit machine needs the matching RID build; the x64 build won't
  run natively on ARM without emulation.
- **Debug ≠ portable.** Only `-c Release -r <rid>` produces the self-contained output. Debug builds stay
  framework-dependent (intentionally — faster dev iteration) and need the runtimes installed.
