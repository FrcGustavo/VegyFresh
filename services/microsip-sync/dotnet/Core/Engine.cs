using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
namespace Microsip.Sync;

public sealed class Engine(Config config, ISource source, IHistory history, IAdapter adapter)
{
    public static string Reference(Config c, string id) => $"vegyfresh:{c.OrganizationId}:{id}";
    public static bool Eligible(JsonElement o, Config c) => o.Text("organization_id") == c.OrganizationId &&
        o.Text("origin") == "WHATSAPP" && c.EligibleStatuses.Contains(o.Text("status")) &&
        DateTimeOffset.TryParse(o.Text("created_at"), out var created) && created >= DateTimeOffset.Parse(c.Since);
    public static DestinationOrder Map(JsonElement o, Config c)
    {
        static void Require(bool ok, string reason) { if (!ok) throw new MappingException(reason); }
        var id = o.Text("id"); var clientId = o.Text("client_id"); var client = o.GetProperty("client");
        Require(Guid.TryParseExact(id, "D", out _) && o.Text("organization_id") == c.OrganizationId, "Order organization or ID invalid");
        Require(client.Text("id") == clientId && client.Text("organization_id") == c.OrganizationId, "Client relationship invalid");
        Require(c.Clients.TryGetValue(clientId, out var customer) && !string.IsNullOrWhiteSpace(customer), "Client mapping missing");
        var lines = new List<Line>();
        foreach (var item in o.GetProperty("items").EnumerateArray())
        {
            var p = item.GetProperty("product"); var unit = p.Text("unit");
            Require(item.Text("order_id") == id && item.Text("product_id") == p.Text("id") && p.Text("organization_id") == c.OrganizationId, "Product relationship invalid");
            Require(c.Units.TryGetValue(unit, out var mappedUnit), "Unit mapping missing");
            var raw = item.GetProperty("quantity"); var text = raw.ValueKind == JsonValueKind.String ? raw.GetString()! : raw.GetRawText();
            Require(Regex.IsMatch(text, @"^\d+(\.\d{1,3})?$") && decimal.TryParse(text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out _), "Quantity precision invalid");
            var quantity = decimal.Parse(text, CultureInfo.InvariantCulture);
            Require(quantity > 0 && quantity <= 999999999.999m && (unit != "pz" || decimal.Truncate(quantity) == quantity), "Quantity range invalid");
            lines.Add(new(p.Text("folio"), mappedUnit!, quantity));
        }
        var payload = new DestinationOrder(Reference(c, id), c.Company, c.Branch, c.Warehouse, customer!, lines.ToArray());
        Simulator.Check(payload);
        return payload;
    }
    public async Task<Summary> Cycle(CancellationToken cancellationToken = default, DateTimeOffset? clock = null)
    {
        var now = clock ?? DateTimeOffset.UtcNow; var summary = new Summary();
        foreach (var entry in history.List().Where(e => e.Status == "submitting"))
        {
            if (cancellationToken.IsCancellationRequested) return summary;
            var p = entry.Payload;
            if (entry.ExternalId != Reference(config, entry.OrderId) || p == null || p.ExternalId != entry.ExternalId || p.Company != config.Company || p.Branch != config.Branch || p.Warehouse != config.Warehouse || !SafePayload(p))
            { SaveReview(entry, now, "Local submission identity invalid"); summary.Review++; }
            else summary.Count(await Reconcile(entry, now));
        }
        await foreach (var listed in source.List(cancellationToken))
        {
            if (cancellationToken.IsCancellationRequested) break;
            summary.Scanned++;
            if (!Eligible(listed, config)) { summary.Skipped++; continue; }
            var id = listed.Text("id"); var entry = history.Get(id);
            if (entry?.Status is "synced" or "review" or "submitting") { summary.Skipped++; continue; }
            if (entry != null && entry.ExternalId != Reference(config, id)) { SaveReview(entry, now, "History reference mismatch"); summary.Review++; continue; }
            if (entry?.NextAttemptAt != null && DateTimeOffset.Parse(entry.NextAttemptAt) > now) { summary.Skipped++; continue; }
            entry ??= new(id, Reference(config, id), "retry", 0, now.ToString("O"));
            JsonElement fresh;
            try { fresh = await source.Get(id, cancellationToken); }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { break; }
            catch { summary.Count(Failure(entry, now, "VegyFresh order could not be refreshed")); continue; }
            if (fresh.Text("id") != id || !Eligible(fresh, config)) { summary.Skipped++; continue; }
            DestinationOrder payload;
            try { payload = Map(fresh, config); }
            catch (MappingException e) { summary.Count(Failure(entry, now, e.Message)); continue; }
            catch { summary.Count(Failure(entry, now, "Order mapping incomplete or invalid")); continue; }
            try { await adapter.Validate(payload).WaitAsync(TimeSpan.FromSeconds(30), cancellationToken); }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { break; }
            catch (MappingException e) { summary.Count(Failure(entry with { Payload = payload }, now, e.Message)); continue; }
            catch { summary.Count(Failure(entry with { Payload = payload }, now, "Microsip simulator validation failed")); continue; }
            if (cancellationToken.IsCancellationRequested) break;
            entry = entry with { Status = "submitting", Attempts = entry.Attempts + 1, UpdatedAt = now.ToString("O"), NextAttemptAt = null, Payload = payload, Error = null };
            history.Save(entry); // Durable intent precedes all external writes.
            try
            {
                var receipt = await adapter.Create(payload).WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);
                if (!receipt.Valid) throw new InvalidDataException("Invalid receipt");
                history.Save(entry with { Status = "synced", Receipt = receipt }); summary.Synced++;
            }
            catch (TimeoutException) { SaveReview(entry, now, "Write timed out; outcome unknown"); summary.Review++; }
            catch (OperationCanceledException) { SaveReview(entry, now, "Write interrupted; outcome unknown"); summary.Review++; }
            catch { summary.Count(await Reconcile(entry, now)); }
        }
        return summary;
    }
    static bool SafePayload(DestinationOrder payload)
    {
        try { Simulator.Check(payload); return true; }
        catch { return false; }
    }
    string Failure(Entry e, DateTimeOffset now, string error)
    {
        e = e with { Attempts = e.Attempts + 1, Error = error };
        return SaveRetry(e, now);
    }
    string SaveRetry(Entry e, DateTimeOffset now)
    {
        if (e.Attempts >= config.MaxAttempts) { SaveReview(e, now, e.Error ?? "Attempts exhausted"); return "review"; }
        var delay = Math.Min(config.RetryDelayMs * Math.Pow(2, Math.Min(30, Math.Max(0, e.Attempts - 1))), TimeSpan.FromDays(30).TotalMilliseconds);
        history.Save(e with { Status = "retry", UpdatedAt = now.ToString("O"), NextAttemptAt = now.AddMilliseconds(delay).ToString("O") }); return "retry";
    }
    void SaveReview(Entry e, DateTimeOffset now, string error) => history.Save(e with { Status = "review", UpdatedAt = now.ToString("O"), NextAttemptAt = null, Receipt = null, Error = error });
    async Task<string> Reconcile(Entry e, DateTimeOffset now)
    {
        Lookup result;
        try { result = await adapter.Lookup(e.ExternalId, config.Company).WaitAsync(TimeSpan.FromSeconds(30)); }
        catch { result = new("unknown"); }
        if (result.Status == "found" && result.Receipt?.Valid == true)
        { history.Save(e with { Status = "synced", UpdatedAt = now.ToString("O"), Receipt = result.Receipt, Error = null, NextAttemptAt = null }); return "synced"; }
        if (result.Status == "absent") return SaveRetry(e with { Error = "Destination confirmed durable absence" }, now);
        SaveReview(e, now, "Microsip write outcome unknown; manual review required"); return "review";
    }
}
public sealed class MappingException(string message) : Exception(message);
