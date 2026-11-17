using System.Text.Json;
using System.Text.Json.Serialization;

namespace Microsip.Sync;

public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    public static string Encode<T>(T value) => JsonSerializer.Serialize(value, Options);
    public static T Decode<T>(string value) => JsonSerializer.Deserialize<T>(value, Options) ?? throw new InvalidDataException("Invalid JSON");
}
public sealed record Line(string ProductKey, string Unit, decimal Quantity);
public sealed record DestinationOrder(string ExternalId, string Company, string Branch, string Warehouse, string CustomerKey, Line[] Lines);
public sealed record Receipt(string Folio, string RecordedAt)
{
    [System.Text.Json.Serialization.JsonIgnore]
    public bool Valid => !string.IsNullOrWhiteSpace(Folio) && DateTimeOffset.TryParse(RecordedAt, out _);
}
public sealed record Lookup(string Status, Receipt? Receipt = null);
public sealed record Entry(string OrderId, string ExternalId, string Status, int Attempts, string UpdatedAt,
    string? NextAttemptAt = null, Receipt? Receipt = null, string? Error = null, DestinationOrder? Payload = null);
public sealed class Summary
{
    public int Scanned { get; set; }
    public int Synced { get; set; }
    public int Skipped { get; set; }
    public int Retry { get; set; }
    public int Review { get; set; }
    public void Count(string status) { if (status == "synced") Synced++; else if (status == "retry") Retry++; else Review++; }
}
public interface IAdapter : IDisposable
{
    Task Validate(DestinationOrder order);
    Task<Receipt> Create(DestinationOrder order);
    Task<Lookup> Lookup(string externalId, string company);
}
public interface ISource
{
    IAsyncEnumerable<JsonElement> List(CancellationToken cancellationToken = default);
    Task<JsonElement> Get(string id, CancellationToken cancellationToken = default);
}
public interface IHistory
{
    Entry? Get(string id);
    Entry[] List();
    void Save(Entry entry);
}
