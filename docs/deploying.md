# Deploying

MHFU LookUp ships as an **MSIX package** — a signed installer that gives users a proper Start Menu entry, clean uninstall via Add/Remove Programs, and no SmartScreen warnings (once signed with a trusted certificate).

## Build the MSIX

```powershell
# x64 (the usual target)
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x64
```

Output folder:

```
src/MhfuLookup.App/bin/Release/net8.0-windows10.0.19041.0/win-x64/AppPackages/
```

The `.msix` file inside that folder is the installer. It is **self-contained** — the .NET runtime and Windows App SDK are bundled, so it runs on a clean Windows 10 1809+ machine with nothing pre-installed.

Other architectures:

```powershell
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-arm64
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x86
```

## Signing (required to install)

MSIX packages must be signed before they can be installed. The signing certificate's subject must match the `Publisher` field in [`Package.appxmanifest`](../src/MhfuLookup.App/Package.appxmanifest) (`CN=ArmoredRaven17`).

### Option A — Self-signed (local testing / trusted distribution)

Creates a certificate on your machine and signs the package. Recipients must install the certificate as a Trusted Root before they can install the MSIX.

```powershell
# 1. Create a self-signed cert (run once)
$cert = New-SelfSignedCertificate `
    -Type CodeSigningCert `
    -Subject "CN=ArmoredRaven17" `
    -KeyUsage DigitalSignature `
    -FriendlyName "MHFU LookUp Code Signing" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3","2.5.29.19={text}")

# 2. Export it as a PFX (set your own password)
Export-PfxCertificate -Cert $cert -FilePath MhfuLookup.pfx -Password (ConvertTo-SecureString -String "YourPassword" -Force -AsPlainText)

# 3. Sign the built MSIX
$msix = Get-ChildItem "src\MhfuLookup.App\bin\Release\net8.0-windows10.0.19041.0\win-x64\AppPackages\" -Filter "*.msix" | Select-Object -First 1
& "C:\Program Files (x86)\Windows Kits\10\bin\10.0.28000.0\x64\signtool.exe" sign /fd SHA256 /p7co 1.3.6.1.4.1.311.10.3.13 /p7 . /f MhfuLookup.pfx /p YourPassword $msix.FullName
```

Recipients install the certificate first:

```powershell
# Recipients run this once to trust the self-signed cert
Import-Certificate -FilePath MhfuLookup.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople
```

### Option B — Microsoft Trusted Signing (~$9.99/month)

[Trusted Signing](https://learn.microsoft.com/azure/trusted-signing/) is Microsoft's low-cost cloud signing service. Packages signed this way install without any extra certificate step — Windows trusts them automatically. Recommended for public GitHub Releases distribution.

### Option C — Commercial code-signing certificate

A certificate from DigiCert, Sectigo, etc. (~$70–200/year) removes the SmartScreen warning and works like Trusted Signing. The subject in `Package.appxmanifest` must match the certificate's CN.

## Target requirements

- **Windows 10 1809 (build 17763) or newer**, matching the RID's architecture.
- With the self-contained publish: **nothing else** — no .NET runtime, no Windows App SDK.

## What ships in the package

- `mhfu.db` — the game database
- All icon assets — Monsters, Items, Locations, Decorations, Materials, Awards, WeaponTypes, etc.
- `docs\gather-extraction.md` — bundled for the About page offline read-up
- The app font (`Assets/Fonts/mhfu_font.ttf`)

## Framework-dependent build (smaller package, needs prerequisites)

```powershell
dotnet publish src/MhfuLookup.App/MhfuLookup.App.csproj -c Release -r win-x64 `
  -p:SelfContained=false -p:WindowsAppSDKSelfContained=false
```

The target machine then needs:

- **.NET 8 Desktop Runtime** — <https://dotnet.microsoft.com/download/dotnet/8.0>
- **Windows App SDK 2.2 Runtime** — <https://learn.microsoft.com/windows/apps/windows-app-sdk/downloads>

## Updating the database

If you change the game data, rebuild the database first so the fresh `mhfu.db` is the one that gets packaged:

```powershell
dotnet run --project src/MhfuLookup.DataMigration -c Debug
```
