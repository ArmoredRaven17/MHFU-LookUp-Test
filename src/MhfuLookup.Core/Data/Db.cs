using Microsoft.Data.Sqlite;

namespace MhfuLookup.Core.Data;

/// <summary>Connection helpers for the SQLite database.</summary>
public static class Db
{
    public static SqliteConnection Open(string path)
    {
        var cs = new SqliteConnectionStringBuilder { DataSource = path }.ToString();
        var conn = new SqliteConnection(cs);
        conn.Open();
        using var pragma = conn.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_keys = ON;";
        pragma.ExecuteNonQuery();
        return conn;
    }

    public static void CreateSchema(SqliteConnection conn)
    {
        using var cmd = conn.CreateCommand();
        cmd.CommandText = Schema.Ddl;
        cmd.ExecuteNonQuery();
    }
}
