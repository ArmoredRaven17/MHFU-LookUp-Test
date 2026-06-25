using MhfuLookup.Core.Data;

namespace MhfuLookup.App.Services;

/// <summary>Single shared database connection for the app.</summary>
public static class AppDb
{
    private static MhfuDatabase? _db;
    public static MhfuDatabase Instance => _db ??= new MhfuDatabase(LocateDb());

    private static string LocateDb()
    {
        // Shipped next to the exe (csproj copies it).
        var local = Path.Combine(AppContext.BaseDirectory, "mhfu.db");
        if (File.Exists(local)) return local;

        // Dev fallback: walk up to MHFU_DB/data/mhfu.db.
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var cand = Path.Combine(dir.FullName, "data", "mhfu.db");
            if (File.Exists(cand)) return cand;
            dir = dir.Parent;
        }
        return local; // will surface a clear error on open
    }
}
