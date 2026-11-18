using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;

namespace Microsip.Sync;

public static class Storage
{
    public static void PrivateDirectory(string path)
    {
        Directory.CreateDirectory(path);
        if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute);
    }
    public static SqliteConnection Open(string path, int applicationId, string schema, bool readOnly = false)
    {
        var db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Mode = readOnly ? SqliteOpenMode.ReadOnly : SqliteOpenMode.ReadWriteCreate, Pooling = false, DefaultTimeout = 1 }.ToString());
        try
        {
            db.Open();
            var app = Convert.ToInt32(Scalar(db, "PRAGMA application_id"));
            var version = Convert.ToInt32(Scalar(db, "PRAGMA user_version"));
            if ((app != applicationId && (app != 0 || readOnly)) || (version != 1 && (version != 0 || readOnly)) ||
                (app == 0 && Convert.ToInt32(Scalar(db, "SELECT count(*) FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'")) > 0))
                throw new InvalidDataException("Unrecognized SQLite application or schema");
            if (!readOnly)
            {
                Exec(db, "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;");
                Exec(db, $"BEGIN IMMEDIATE; PRAGMA application_id={applicationId}; PRAGMA user_version=1; {schema} COMMIT;");
                if (!OperatingSystem.IsWindows()) File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
            }
            return db;
        }
        catch { db.Dispose(); throw; }
    }
    public static void Exec(SqliteConnection db, string sql, params object?[] values) { using var cmd = Command(db, sql, values); cmd.ExecuteNonQuery(); }
    public static object? Scalar(SqliteConnection db, string sql, params object?[] values) { using var cmd = Command(db, sql, values); return cmd.ExecuteScalar(); }
    public static SqliteCommand Command(SqliteConnection db, string sql, params object?[] values)
    {
        var cmd = db.CreateCommand(); cmd.CommandText = sql;
        for (int i = 0; i < values.Length; i++) cmd.Parameters.AddWithValue("$" + i, values[i] ?? DBNull.Value);
        return cmd;
    }
    public static void Atomic(SqliteConnection db, Action action)
    {
        Exec(db, "BEGIN IMMEDIATE");
        try { action(); Exec(db, "COMMIT"); }
        catch { Exec(db, "ROLLBACK"); throw; }
    }
}
public sealed class CompanyLock : IDisposable
{
    readonly SqliteConnection db;
    public CompanyLock(string company)
    {
        var directory = Environment.GetEnvironmentVariable("MICROSIP_SYNC_LOCK_DIR") ?? Path.Combine(Path.GetTempPath(), "vegyfresh-microsip-locks", OperatingSystem.IsWindows() ? "user" : UnixIdentity.GetEffectiveUserId().ToString());
        Storage.PrivateDirectory(directory);
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(company))).ToLowerInvariant();
        db = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(directory, hash + ".sqlite"), DefaultTimeout = 1, Pooling = false }.ToString());
        try { db.Open(); Storage.Exec(db, "PRAGMA busy_timeout=0"); Storage.Exec(db, "BEGIN IMMEDIATE"); }
        catch { db.Dispose(); throw new InvalidOperationException("Company synchronization is already running or lock unavailable"); }
    }
    public void Dispose() => db.Dispose();
}
public sealed class History : IHistory, IDisposable
{
    const int App = 0x56464849;
    const string Schema = """
        CREATE TABLE IF NOT EXISTS history_identity(singleton INTEGER PRIMARY KEY CHECK(singleton=1),company TEXT NOT NULL,organization_id TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS history_entries(order_id TEXT PRIMARY KEY,external_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('retry','submitting','synced','review')),attempts INTEGER NOT NULL CHECK(attempts>=0),updated_at TEXT NOT NULL,next_attempt_at TEXT,receipt_json TEXT,error TEXT,payload_json TEXT);
        CREATE TABLE IF NOT EXISTS history_events(event_id INTEGER PRIMARY KEY AUTOINCREMENT,order_id TEXT NOT NULL,previous_status TEXT,next_status TEXT NOT NULL,occurred_at TEXT NOT NULL,entry_json TEXT NOT NULL);
        CREATE TRIGGER IF NOT EXISTS history_events_no_update BEFORE UPDATE ON history_events BEGIN SELECT RAISE(ABORT,'history events are append-only'); END;
        CREATE TRIGGER IF NOT EXISTS history_events_no_delete BEFORE DELETE ON history_events BEGIN SELECT RAISE(ABORT,'history events are append-only'); END;
        """;
    readonly SqliteConnection db;
    readonly CompanyLock? companyLock;
    public History(Config config, bool readOnly = false)
    {
        if (!readOnly) { Storage.PrivateDirectory(config.DataDir); companyLock = new(config.Company); }
        try
        {
            db = Storage.Open(Path.Combine(config.DataDir, "history.sqlite"), App, Schema, readOnly);
            try
            {
                if (!readOnly) Storage.Exec(db, "INSERT OR IGNORE INTO history_identity VALUES(1,$0,$1)", config.Company, config.OrganizationId);
                using var cmd = Storage.Command(db, "SELECT company,organization_id FROM history_identity WHERE singleton=1");
                using var row = cmd.ExecuteReader();
                if (!row.Read() || row.GetString(0) != config.Company || row.GetString(1) != config.OrganizationId) throw new InvalidDataException("History identity mismatch");
            }
            catch { db.Dispose(); throw; }
        }
        catch { companyLock?.Dispose(); throw; }
    }
    static Entry Decode(SqliteDataReader r) => new(r.GetString(0), r.GetString(1), r.GetString(2), r.GetInt32(3), r.GetString(4),
        r.IsDBNull(5) ? null : r.GetString(5), r.IsDBNull(6) ? null : Json.Decode<Receipt>(r.GetString(6)),
        r.IsDBNull(7) ? null : r.GetString(7), r.IsDBNull(8) ? null : Json.Decode<DestinationOrder>(r.GetString(8)));
    public Entry? Get(string id)
    {
        using var cmd = Storage.Command(db, "SELECT order_id,external_id,status,attempts,updated_at,next_attempt_at,receipt_json,error,payload_json FROM history_entries WHERE order_id=$0", id);
        using var row = cmd.ExecuteReader(); return row.Read() ? Decode(row) : null;
    }
    public Entry[] List()
    {
        using var cmd = Storage.Command(db, "SELECT order_id,external_id,status,attempts,updated_at,next_attempt_at,receipt_json,error,payload_json FROM history_entries ORDER BY updated_at,order_id");
        using var rows = cmd.ExecuteReader(); var list = new List<Entry>(); while (rows.Read()) list.Add(Decode(rows)); return list.ToArray();
    }
    public void Save(Entry e)
    {
        if (string.IsNullOrWhiteSpace(e.OrderId) || string.IsNullOrWhiteSpace(e.ExternalId) || e.Attempts < 0 || e.Status is not ("retry" or "review" or "submitting" or "synced")) throw new InvalidDataException("Invalid history entry");
        Storage.Atomic(db, () =>
        {
            var previous = Get(e.OrderId);
            Storage.Exec(db, """
                INSERT INTO history_entries VALUES($0,$1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(order_id) DO UPDATE SET
                external_id=excluded.external_id,status=excluded.status,attempts=excluded.attempts,updated_at=excluded.updated_at,next_attempt_at=excluded.next_attempt_at,receipt_json=excluded.receipt_json,error=excluded.error,payload_json=excluded.payload_json
                """, e.OrderId, e.ExternalId, e.Status, e.Attempts, e.UpdatedAt, e.NextAttemptAt, e.Receipt == null ? null : Json.Encode(e.Receipt), e.Error, e.Payload == null ? null : Json.Encode(e.Payload));
            Storage.Exec(db, "INSERT INTO history_events(order_id,previous_status,next_status,occurred_at,entry_json) VALUES($0,$1,$2,$3,$4)", e.OrderId, previous?.Status, e.Status, e.UpdatedAt, Json.Encode(e));
        });
    }
    public void BindAdapter(Config c, bool readOnly = false)
    {
        var prior = Get("__adapter_identity__");
        if (prior != null && prior.ExternalId != c.AdapterIdentity) throw new InvalidDataException("Use another dataDir when changing adapters");
        if (prior == null)
        {
            if (readOnly) throw new InvalidDataException("Missing adapter identity");
            Save(new("__adapter_identity__", c.AdapterIdentity, "synced", 0, DateTimeOffset.UtcNow.ToString("O")));
        }
    }
    public void Dispose() { db.Dispose(); companyLock?.Dispose(); }
}

internal static class UnixIdentity
{
    [System.Runtime.InteropServices.DllImport("libc", EntryPoint = "geteuid")]
    internal static extern uint GetEffectiveUserId();
}
