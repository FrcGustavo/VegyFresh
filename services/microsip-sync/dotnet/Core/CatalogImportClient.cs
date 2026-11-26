using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace Microsip.Sync;

public class CatalogImportException(string message) : Exception(message);

public sealed record CatalogImportCounts(int Created, int Updated, int Unchanged);
public sealed record CatalogImportSummary(string Mode, DateTimeOffset? AppliedAt, CatalogImportCounts Products,
    CatalogImportCounts PriceLists, CatalogImportCounts Prices, CatalogImportCounts Clients);

public sealed class PreparedCatalogImport
{
    readonly byte[] payload;
    readonly CatalogImportConfig target;

    internal PreparedCatalogImport(CatalogImportConfig target, byte[] payload, CatalogImportSummary summary)
    {
        this.target = target;
        this.payload = payload;
        Summary = summary;
    }

    public CatalogImportSummary Summary { get; }

    internal byte[] PayloadFor(CatalogImportConfig config)
    {
        if (target.ApiBaseUrl != config.ApiBaseUrl || target.OrganizationId != config.OrganizationId || target.Company != config.Company)
            throw new CatalogImportException("This preview belongs to a different catalog import destination.");
        return payload;
    }
}

public sealed class CatalogImportClient : IDisposable
{
    const int RequestLimit = 2 * 1024 * 1024;
    const int ResponseLimit = 8192;
    const int App = 0x56464349;
    const string Schema = """
        CREATE TABLE IF NOT EXISTS catalog_import_state(
            api_base_url TEXT NOT NULL, organization_id TEXT NOT NULL, company TEXT NOT NULL,
            last_success TEXT, pending_key TEXT, pending_hash BLOB,
            PRIMARY KEY(api_base_url,organization_id,company),
            CHECK((pending_key IS NULL) = (pending_hash IS NULL))
        );
        """;
    const string Target = "api_base_url=$0 AND organization_id=$1 AND company=$2";
    static readonly string[] Collections = ["products", "priceLists", "prices", "clients"];
    readonly CatalogImportConfig config;
    readonly HttpClient http;
    readonly object[] target;

    public CatalogImportClient(CatalogImportConfig config)
        : this(config, new HttpClientHandler { AllowAutoRedirect = false, UseCookies = false })
    {
    }

    internal CatalogImportClient(CatalogImportConfig config, HttpMessageHandler handler)
    {
        this.config = config;
        target = [config.ApiBaseUrl, config.OrganizationId, config.Company];
        http = new HttpClient(handler);
    }

    public async Task<PreparedCatalogImport> Preview(string path, CancellationToken cancellationToken = default)
    {
        var payload = await Prepare(path, cancellationToken);
        var token = await Token(cancellationToken);
        var summary = await Request("preview", payload, token, null, cancellationToken);
        return new(config, payload, summary);
    }

    public async Task<CatalogImportSummary> Apply(PreparedCatalogImport prepared, CancellationToken cancellationToken = default)
    {
        var payload = prepared.PayloadFor(config);
        var token = await Token(cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        var key = Guid.NewGuid().ToString("D");
        using (var db = Open())
        {
            Storage.Atomic(db, () =>
            {
                Storage.Exec(db, "INSERT OR IGNORE INTO catalog_import_state(api_base_url,organization_id,company) VALUES($0,$1,$2)", target);
                if (Storage.Scalar(db, $"SELECT pending_key FROM catalog_import_state WHERE {Target}", target) is string)
                    throw new CatalogImportException("Resolve the pending catalog apply before starting another.");
                Storage.Exec(db, $"UPDATE catalog_import_state SET pending_key=$3,pending_hash=$4 WHERE {Target}", [.. target, key, SHA256.HashData(payload)]);
            });
        }

        return await FinishApply(key, payload, token, true, cancellationToken);
    }

    public bool HasPendingApply()
    {
        using var db = Open();
        return Storage.Scalar(db, $"SELECT pending_key FROM catalog_import_state WHERE {Target}", target) is string;
    }

    public async Task<CatalogImportSummary> RetryPendingApply(string path, CancellationToken cancellationToken = default)
    {
        var payload = await Prepare(path, cancellationToken);
        string key;
        using (var db = Open())
        using (var command = Storage.Command(db, $"SELECT pending_key,pending_hash FROM catalog_import_state WHERE {Target} AND pending_key IS NOT NULL", target))
        using (var row = command.ExecuteReader())
        {
            if (!row.Read()) throw new CatalogImportException("There is no pending catalog apply.");
            key = row.GetString(0);
            if (!SHA256.HashData(payload).AsSpan().SequenceEqual((byte[])row.GetValue(1)))
                throw new CatalogImportException("Select the original catalog snapshot to retry this apply.");
        }

        var token = await Token(cancellationToken);
        return await FinishApply(key, payload, token, false, cancellationToken);
    }

    public CatalogImportSummary? LastSuccess()
    {
        using var db = Open();
        return Storage.Scalar(db, $"SELECT last_success FROM catalog_import_state WHERE {Target}", target) is string json
            ? ReadSummary(Encoding.UTF8.GetBytes(json), "apply")
            : null;
    }

    async Task<CatalogImportSummary> FinishApply(string key, byte[] payload, string token, bool fresh, CancellationToken cancellationToken)
    {
        CatalogImportSummary summary;
        try { summary = await Request("apply", payload, token, key, cancellationToken, fresh); }
        catch (CatalogRejectedException)
        {
            using var db = Open();
            Storage.Exec(db, $"UPDATE catalog_import_state SET pending_key=NULL,pending_hash=NULL WHERE {Target} AND pending_key=$3", [.. target, key]);
            throw;
        }

        using (var db = Open())
        {
            Storage.Exec(db, $"UPDATE catalog_import_state SET last_success=$4,pending_key=NULL,pending_hash=NULL WHERE {Target} AND pending_key=$3",
                [.. target, key, Json.Encode(summary)]);
        }
        return summary;
    }

    SqliteConnection Open()
    {
        Storage.PrivateDirectory(config.DataDir);
        return Storage.Open(Path.Combine(config.DataDir, "catalog-import.sqlite"), App, Schema);
    }

    async Task<byte[]> Prepare(string path, CancellationToken cancellationToken)
    {
        using var input = File.OpenRead(path);
        var bytes = await ReadBounded(input, RequestLimit, "Catalog input exceeds 2 MiB.", cancellationToken);
        ReadOnlyMemory<byte> json = bytes;
        if (bytes.AsSpan().StartsWith(Encoding.UTF8.Preamble)) json = json[Encoding.UTF8.Preamble.Length..];
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                root.EnumerateObject().Count() != Collections.Length ||
                !Collections.All(name => root.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Array))
                throw new CatalogImportException("Catalog input must contain products, priceLists, prices and clients arrays.");
            ValidateSnapshot(root);

            using var output = new MemoryStream();
            using (var writer = new Utf8JsonWriter(output))
            {
                writer.WriteStartObject();
                writer.WriteString("organizationId", config.OrganizationId);
                writer.WriteString("company", config.Company);
                foreach (var name in Collections)
                {
                    writer.WritePropertyName(name);
                    root.GetProperty(name).WriteTo(writer);
                }
                writer.WriteEndObject();
            }
            if (output.Length > RequestLimit) throw new CatalogImportException("Catalog request exceeds 2 MiB.");
            return output.ToArray();
        }
        catch (JsonException) { throw new CatalogImportException("Catalog input is invalid JSON."); }
    }

    static void ValidateSnapshot(JsonElement root)
    {
        static bool Text(JsonElement item, string name, bool optional = false)
        {
            if (!item.TryGetProperty(name, out var value)) return optional;
            return value.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(value.GetString()) &&
                value.GetString()!.Length <= 255 && !value.GetString()!.Any(char.IsControl);
        }
        static bool Uuid(JsonElement item, string name, bool optional = false)
        {
            if (!item.TryGetProperty(name, out var value)) return optional;
            return value.ValueKind == JsonValueKind.String && Guid.TryParseExact(value.GetString(), "D", out _);
        }
        static bool Fields(JsonElement item, params string[] names) => item.ValueKind == JsonValueKind.Object &&
            item.EnumerateObject().Select(property => property.Name).Distinct(StringComparer.Ordinal).Count() == item.EnumerateObject().Count() &&
            item.EnumerateObject().All(property => names.Contains(property.Name, StringComparer.Ordinal));
        static void Require(bool valid)
        {
            if (!valid) throw new CatalogImportException("Catalog input contains invalid entries.");
        }
        foreach (var item in root.GetProperty("products").EnumerateArray())
            Require(Fields(item, "externalId", "name", "unit", "supplierId", "vegyfreshId") &&
                Text(item, "externalId") && Text(item, "name") && Uuid(item, "supplierId") && Uuid(item, "vegyfreshId", true) &&
                item.TryGetProperty("unit", out var unit) && unit.ValueKind == JsonValueKind.String && unit.GetString() is "kg" or "pz");
        foreach (var item in root.GetProperty("priceLists").EnumerateArray())
            Require(Fields(item, "externalId", "name", "vegyfreshId") && Text(item, "externalId") &&
                Text(item, "name") && Uuid(item, "vegyfreshId", true));
        foreach (var item in root.GetProperty("prices").EnumerateArray())
            Require(Fields(item, "productExternalId", "priceListExternalId", "price") &&
                Text(item, "productExternalId") && Text(item, "priceListExternalId") &&
                item.TryGetProperty("price", out var price) && price.ValueKind == JsonValueKind.String &&
                System.Text.RegularExpressions.Regex.IsMatch(price.GetString()!, @"^(0|[1-9]\d*)(\.\d{1,2})?$", System.Text.RegularExpressions.RegexOptions.CultureInvariant));
        foreach (var item in root.GetProperty("clients").EnumerateArray())
            Require(Fields(item, "externalId", "name", "phoneNumber", "email", "priceListExternalId", "vegyfreshId") &&
                Text(item, "externalId") && Text(item, "name") && Text(item, "phoneNumber") &&
                Text(item, "priceListExternalId") && Uuid(item, "vegyfreshId", true) &&
                (!item.TryGetProperty("email", out var email) || email.ValueKind == JsonValueKind.Null ||
                    (email.ValueKind == JsonValueKind.String && Text(item, "email"))));
    }

    async Task<string> Token(CancellationToken cancellationToken)
    {
        try
        {
            string token;
            if (config.TokenFile is null)
                token = await Source.Token().WaitAsync(cancellationToken);
            else
            {
                if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MICROSIP_SYNC_API_TOKEN")) ||
                    !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MICROSIP_SYNC_TOKEN_FILE")))
                    throw new InvalidOperationException();
                token = (await File.ReadAllTextAsync(config.TokenFile, cancellationToken)).Trim();
            }

            if (token.Length == 0 || token.Any(character => character is < '!' or > '~'))
                throw new InvalidOperationException();
            return token;
        }
        catch (Exception exception) when (exception is InvalidOperationException or IOException or UnauthorizedAccessException)
        {
            throw new CatalogImportException("Configure one readable catalog API token source.");
        }
    }

    async Task<CatalogImportSummary> Request(string mode, byte[] payload, string token, string? key, CancellationToken cancellationToken, bool fresh = false)
    {
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(TimeSpan.FromSeconds(60));
        using var request = new HttpRequestMessage(HttpMethod.Post, config.ApiBaseUrl + "/catalog/microsip-import/" + mode);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (key is not null) request.Headers.Add("Idempotency-Key", key);
        request.Content = new ByteArrayContent(payload);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
        try
        {
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            if (response.StatusCode != HttpStatusCode.OK)
            {
                var message = $"Catalog API request failed (HTTP {(int)response.StatusCode}).";
                if ((fresh && response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity or HttpStatusCode.RequestEntityTooLarge or HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden) ||
                    (response.StatusCode == HttpStatusCode.Conflict && await IsDefinitiveConflict(response, deadline.Token)))
                    throw new CatalogRejectedException(message);
                throw new CatalogImportException(message);
            }

            if (!string.Equals(response.Content.Headers.ContentType?.MediaType, "application/json", StringComparison.OrdinalIgnoreCase))
                throw new CatalogImportException("Invalid catalog API response.");
            using var body = await response.Content.ReadAsStreamAsync(deadline.Token);
            return ReadSummary(await ReadBounded(body, ResponseLimit, "Invalid catalog API response.", deadline.Token), mode);
        }
        catch (HttpRequestException) { throw new CatalogImportException("Catalog API could not be reached or the response was interrupted."); }
        catch (IOException)
        {
            throw new CatalogImportException("Catalog API response was interrupted.");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new CatalogImportException("Catalog API request timed out.");
        }
    }

    static async Task<bool> IsDefinitiveConflict(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (!string.Equals(response.Content.Headers.ContentType?.MediaType, "application/json", StringComparison.OrdinalIgnoreCase) ||
            response.Content.Headers.ContentLength is > ResponseLimit) return false;
        try
        {
            using var body = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = JsonDocument.Parse(await ReadBounded(body, ResponseLimit, "Invalid catalog API response.", cancellationToken));
            return document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("code", out var code) &&
                code.ValueKind == JsonValueKind.String && code.GetString() == "MICROSIP_IMPORT_CONFLICT";
        }
        catch (Exception exception) when (exception is JsonException or IOException or CatalogImportException)
        {
            return false;
        }
    }

    static CatalogImportSummary ReadSummary(byte[] json, string mode)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (root.EnumerateObject().Count() != 6 || root.GetProperty("mode").GetString() != mode)
                throw new CatalogImportException("Invalid catalog API response.");

            var applied = root.GetProperty("appliedAt");
            DateTimeOffset? appliedAt = null;
            if (mode == "apply" && applied.TryGetDateTimeOffset(out var date) && date.Offset == TimeSpan.Zero)
                appliedAt = date;
            else if (mode != "preview" || applied.ValueKind != JsonValueKind.Null)
                throw new CatalogImportException("Invalid catalog API response.");

            CatalogImportCounts Counts(string name)
            {
                var counts = root.GetProperty(name);
                if (counts.EnumerateObject().Count() != 3) throw new CatalogImportException("Invalid catalog API response.");
                return new(ReadCount(counts, "created"), ReadCount(counts, "updated"), ReadCount(counts, "unchanged"));
            }

            return new(mode, appliedAt, Counts("products"), Counts("priceLists"), Counts("prices"), Counts("clients"));
        }
        catch (Exception exception) when (exception is JsonException or InvalidOperationException or KeyNotFoundException)
        {
            throw new CatalogImportException("Invalid catalog API response.");
        }
    }

    static int ReadCount(JsonElement counts, string name)
    {
        if (counts.GetProperty(name).TryGetInt32(out var value) && value >= 0) return value;
        throw new CatalogImportException("Invalid catalog API response.");
    }

    static async Task<byte[]> ReadBounded(Stream stream, int limit, string error, CancellationToken cancellationToken)
    {
        using var output = new MemoryStream();
        var buffer = new byte[8192];
        while (true)
        {
            var count = await stream.ReadAsync(buffer, cancellationToken);
            if (count == 0) return output.ToArray();
            if (output.Length + count > limit) throw new CatalogImportException(error);
            output.Write(buffer, 0, count);
        }
    }

    public void Dispose() => http.Dispose();

    sealed class CatalogRejectedException(string message) : CatalogImportException(message);
}
