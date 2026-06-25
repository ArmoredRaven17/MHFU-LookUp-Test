using MhfuLookup.Core.Data;
using Microsoft.Data.Sqlite;

// Usage: dotnet run [<dataDir>] [<outputDbPath>]
// Defaults: locate ../mhfu-lookup/data and write to MHFU_DB/data/mhfu.db.

string dataDir = args.Length > 0 ? args[0] : Locator.FindPythonDataDir();
string dbPath = args.Length > 1 ? args[1] : Path.Combine(Locator.FindSolutionDir(), "data", "mhfu.db");

Console.WriteLine($"Data source : {dataDir}");
Console.WriteLine($"Output DB   : {dbPath}");

DatabaseBuilder.Build(dataDir, dbPath);

Validate(dbPath);
Console.WriteLine("Migration complete.");


static void Validate(string dbPath)
{
    using var conn = Db.Open(dbPath);
    long Count(string table)
    {
        using var c = conn.CreateCommand();
        c.CommandText = $"SELECT COUNT(*) FROM {table}";
        return (long)c.ExecuteScalar()!;
    }
    var report = new (string Table, long Count, long? Expect)[]
    {
        ("skills", Count("skills"), null),
        ("decorations", Count("decorations"), 168),
        ("armor_sets", Count("armor_sets"), null),
        ("armor_pieces", Count("armor_pieces"), 1900),
        ("weapons", Count("weapons"), null),
        ("monsters", Count("monsters"), null),
        ("quest_categories", Count("quest_categories"), 5),
        ("gathering_areas", Count("gathering_areas"), null),
    };
    Console.WriteLine("Row counts:");
    var ok = true;
    foreach (var (table, count, expect) in report)
    {
        var flag = expect is null ? "" : (count == expect ? "  OK" : $"  FAIL expected {expect}");
        if (expect is not null && count != expect) ok = false;
        Console.WriteLine($"  {table,-20} {count,6}{flag}");
    }
    if (!ok) throw new InvalidOperationException("Validation failed: row counts did not match expectations.");
}


static class Locator
{
    public static string FindPythonDataDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, "mhfu-lookup", "data");
            if (File.Exists(Path.Combine(candidate, "v2", "armor_skills_v2.json")))
                return candidate;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate mhfu-lookup/data");
    }

    public static string FindSolutionDir()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "MhfuLookup.sln")) ||
                File.Exists(Path.Combine(dir.FullName, "MhfuLookup.slnx")))
                return dir.FullName;
            dir = dir.Parent;
        }
        throw new DirectoryNotFoundException("Could not locate the MhfuLookup solution");
    }
}
