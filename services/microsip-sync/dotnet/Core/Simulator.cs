using Microsoft.Data.Sqlite;
namespace Microsip.Sync;

public sealed class Simulator : IAdapter
{
    readonly SqliteConnection db;
    public Simulator(string directory)
    {
        Storage.PrivateDirectory(directory);
        db = Storage.Open(Path.Combine(directory, "simulator.sqlite"), 0x56465349, """
            CREATE TABLE IF NOT EXISTS simulator_receipts(receipt_id INTEGER PRIMARY KEY AUTOINCREMENT,company TEXT NOT NULL,external_id TEXT NOT NULL,folio TEXT NOT NULL UNIQUE,recorded_at TEXT NOT NULL,UNIQUE(company,external_id));
            """);
    }
    public static void Check(DestinationOrder o)
    {
        static void Key(string s) { if (string.IsNullOrWhiteSpace(s) || s.Length > 128 || s.Contains('\0')) throw new InvalidDataException("Invalid mapping key"); }
        Key(o.ExternalId); Key(o.Company); Key(o.Branch); Key(o.Warehouse); Key(o.CustomerKey);
        if (o.Lines.Length is < 1 or > 500) throw new InvalidDataException("Invalid line count");
        foreach (var l in o.Lines) { Key(l.ProductKey); Key(l.Unit); if (l.Quantity <= 0 || l.Quantity > 999999999.999m) throw new InvalidDataException("Invalid quantity"); }
    }
    public Task Validate(DestinationOrder order) { Check(order); return Task.CompletedTask; }
    public async Task<Receipt> Create(DestinationOrder order)
    {
        await Validate(order);
        Receipt? receipt = null;
        Storage.Atomic(db, () =>
        {
            receipt = Find(order.ExternalId, order.Company);
            if (receipt != null) return;
            var time = DateTimeOffset.UtcNow.ToString("O");
            Storage.Exec(db, "INSERT INTO simulator_receipts(company,external_id,folio,recorded_at) VALUES($0,$1,'pending',$2)", order.Company, order.ExternalId, time);
            var id = Convert.ToInt64(Storage.Scalar(db, "SELECT last_insert_rowid()"));
            receipt = new($"SIM-{id:D8}", time);
            Storage.Exec(db, "UPDATE simulator_receipts SET folio=$0 WHERE receipt_id=$1", receipt.Folio, id);
        });
        return receipt!;
    }
    Receipt? Find(string id, string company)
    {
        using var cmd = Storage.Command(db, "SELECT folio,recorded_at FROM simulator_receipts WHERE company=$0 AND external_id=$1", company, id);
        using var row = cmd.ExecuteReader();
        if (!row.Read()) return null;
        var receipt = new Receipt(row.GetString(0), row.GetString(1));
        if (!receipt.Valid || receipt.Folio == "pending") throw new InvalidDataException("Invalid simulator receipt");
        return receipt;
    }
    public Task<Lookup> Lookup(string externalId, string company)
    {
        var receipt = Find(externalId, company); return Task.FromResult(new Lookup(receipt == null ? "absent" : "found", receipt));
    }
    public void Dispose() => db.Dispose();
}
