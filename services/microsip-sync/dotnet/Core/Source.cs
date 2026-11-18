using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace Microsip.Sync;

// Wire fields and routes follow clients/api-client/src/generated/schema.ts. No API writes.
public sealed class Source(Config config, HttpClient http, Func<Task<string>>? tokenProvider = null) : ISource
{
    public static async Task<string> Token()
    {
        var token = Environment.GetEnvironmentVariable("MICROSIP_SYNC_API_TOKEN")?.Trim();
        var file = Environment.GetEnvironmentVariable("MICROSIP_SYNC_TOKEN_FILE")?.Trim();
        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(file)) throw new InvalidOperationException("Configure only one token source");
        if (!string.IsNullOrEmpty(file)) token = (await File.ReadAllTextAsync(file)).Trim();
        return !string.IsNullOrEmpty(token) ? token : throw new InvalidOperationException("API token is not configured");
    }
    async Task<JsonElement> Request(string route, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        using var request = new HttpRequestMessage(HttpMethod.Get, config.ApiBaseUrl + route);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", await (tokenProvider ?? Token)());
        try
        {
            using var response = await http.SendAsync(request, timeout.Token);
            if (!response.IsSuccessStatusCode) throw new InvalidOperationException($"API request failed (HTTP {(int)response.StatusCode})");
            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeout.Token));
            return doc.RootElement.Clone();
        }
        catch (HttpRequestException) { throw new InvalidOperationException("API request failed"); }
    }
    public async Task<JsonElement> Get(string id, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParseExact(id, "D", out _)) throw new InvalidDataException("Order ID must be UUID");
        var order = await Request("/orders/" + Uri.EscapeDataString(id), cancellationToken);
        Check(order);
        if (order.Text("id") != id) throw new InvalidDataException("API returned another order");
        return order;
    }
    void Check(JsonElement order)
    {
        if (order.Text("organization_id") != config.OrganizationId) throw new InvalidDataException("API returned another organization");
        if (!Guid.TryParseExact(order.Text("id"), "D", out _) || !DateTimeOffset.TryParse(order.Text("created_at"), out _)) throw new InvalidDataException("Invalid API order");
    }
    public async IAsyncEnumerable<JsonElement> List([EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var fingerprints = new HashSet<string>();
        (DateTimeOffset Time, string Id)? previous = null;
        for (int page = 0; page < 10000; page++)
        {
            var result = await Request($"/orders?created_filter=range&created_from={config.Since[..10]}&order_by=created_at&order=asc&limit={config.PageSize}&offset={page * config.PageSize}", cancellationToken);
            var array = result.ValueKind == JsonValueKind.Array ? result : result.GetProperty("data");
            var items = array.EnumerateArray().ToArray();
            if (items.Length == 0) yield break;
            if (items.Length > config.PageSize) throw new InvalidDataException("Oversized API page");
            var ids = items.Select(o => o.Text("id")).ToArray();
            if (ids.Distinct().Count() != ids.Length || !fingerprints.Add(Json.Encode(ids))) throw new InvalidDataException("Repeated API page or order");
            foreach (var order in items)
            {
                Check(order);
                var key = (Time: DateTimeOffset.Parse(order.Text("created_at")), Id: order.Text("id"));
                if (previous is {} p && (p.Time > key.Time || (p.Time == key.Time && string.CompareOrdinal(p.Id, key.Id) >= 0))) throw new InvalidDataException("API pages are not stably sorted");
                previous = key;
            }
            foreach (var order in items) if (Engine.Eligible(order, config)) yield return order;
            if (items.Length < config.PageSize) yield break;
        }
        throw new InvalidDataException("API pagination exceeded safety limit");
    }
}
public static class Fields
{
    public static string Text(this JsonElement e, string key) => e.GetProperty(key).GetString() ?? throw new InvalidDataException("Missing field");
}
