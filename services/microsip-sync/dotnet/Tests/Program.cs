using Microsip.Sync;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Diagnostics;
using System.Runtime.CompilerServices;

if (args.FirstOrDefault() == "lock-child")
{
    try { using var l = new CompanyLock(args[1]); Console.WriteLine("locked"); await Task.Delay(Timeout.Infinite); return 0; }
    catch { return 7; }
}
if (args.FirstOrDefault() == "crash-child")
{
    var c = Config.Load("config.example.json") with { DataDir = args[2] };
    using var h = new History(c); h.BindAdapter(c); using var sim = new Simulator(c.DataDir);
    await new Engine(c, new FakeSource([Order(c)]), h, new CrashAdapter(sim, args[1])).Cycle();
    return 9;
}
var temp = Path.Combine(Path.GetTempPath(), "microsip-tests-" + Guid.NewGuid());
Directory.CreateDirectory(temp);
Environment.SetEnvironmentVariable("MICROSIP_SYNC_LOCK_DIR", Path.Combine(temp, "locks"));
int passed = 0, failed = 0;
async Task Test(string name, Func<Task> test)
{
    try { await test(); passed++; Console.WriteLine("PASS " + name); }
    catch (Exception e) { failed++; Console.Error.WriteLine("FAIL " + name + ": " + e); }
}
void Assert(bool value, string? message = null) { if (!value) throw new Exception(message ?? "Assertion failed"); }
void Throws(Action action) { try { action(); } catch { return; } throw new Exception("Expected rejection"); }
async Task Reject(Func<Task> action) { try { await action(); } catch { return; } throw new Exception("Expected rejection"); }
Config C() => Config.Load(Path.GetFullPath("config.example.json")) with { DataDir = Path.Combine(temp, Guid.NewGuid().ToString()), RetryDelayMs = 1 };
JsonElement Order(Config c, string? id = null, string status = "APPROVED", string quantity = "1.125", string unit = "kg")
{
    id ??= "00000000-0000-4000-8000-000000000010";
    var client = c.Clients.Keys.First(); var product = "00000000-0000-4000-8000-000000000020";
    return JsonSerializer.SerializeToElement(new
    {
        id,
        organization_id = c.OrganizationId,
        created_at = c.Since,
        origin = "WHATSAPP",
        status,
        client_id = client,
        client = new { id = client, organization_id = c.OrganizationId },
        items = new[] { new { order_id = id, product_id = product, quantity, product = new { id = product, organization_id = c.OrganizationId, folio = " FOLIO-01 ", unit } } }
    });
}
JsonElement Change(JsonElement order, string from, string to) => JsonDocument.Parse(order.GetRawText().Replace(from, to)).RootElement.Clone();
async Task WithCycle(Func<Config, History, Simulator, JsonElement, Task> test)
{
    var c = C(); using var h = new History(c); h.BindAdapter(c); using var s = new Simulator(c.DataDir);
    await test(c, h, s, Order(c));
}
await Test("default simulator, relative config paths and strict fields", () =>
{
    var c = C(); Assert(c.Driver.Mode == "simulator" && Path.IsPathFullyQualified(c.DataDir));
    var path = Path.Combine(temp, "bad.json");
    File.WriteAllText(path, File.ReadAllText("config.example.json").Replace("\"pageSize\": 100", "\"pageSize\": 0")); Throws(() => Config.Load(path));
    File.WriteAllText(path, File.ReadAllText("config.example.json").Replace("\"mode\": \"simulator\"", "\"mode\": \"module\", \"modulePath\": \"evil.js\"")); Throws(() => Config.Load(path));
    File.WriteAllText(path, File.ReadAllText("config.example.json").Replace("\"pageSize\": 100", "\"pageSize\": 100, \"secret\": \"x\"")); Throws(() => Config.Load(path));
    return Task.CompletedTask;
});
await Test("mapping preserves exact folio and decimal quantity", () =>
{
    var c = C(); var p = Engine.Map(Order(c), c); Assert(p.Lines[0].ProductKey == " FOLIO-01 " && p.Lines[0].Quantity == 1.125m);
    Assert(!Json.Encode(p).Contains("price", StringComparison.OrdinalIgnoreCase)); return Task.CompletedTask;
});
foreach (var quantity in new[] { "0", "-1", "1.0001", "1e2", "NaN", "1000000000", " 1", "" })
    await Test("reject quantity " + quantity, () => { var c = C(); Throws(() => Engine.Map(Order(c, quantity: quantity), c)); return Task.CompletedTask; });
await Test("pieces must be whole", () => { var c = C(); Throws(() => Engine.Map(Order(c, unit: "pz"), c)); Assert(Engine.Map(Order(c, unit: "pz", quantity: "2"), c).Lines[0].Quantity == 2); return Task.CompletedTask; });
await Test("invalid product/client/organization relations rejected", () =>
{
    var c = C(); var o = Order(c);
    Throws(() => Engine.Map(Change(o, "\"product_id\":\"00000000-0000-4000-8000-000000000020\"", "\"product_id\":\"different\""), c));
    Throws(() => Engine.Map(Change(o, "\"client_id\":\"" + c.Clients.Keys.First() + "\"", "\"client_id\":\"different\""), c));
    Throws(() => Engine.Map(o, c with { OrganizationId = Guid.NewGuid().ToString() }));
    Throws(() => Engine.Map(o, c with { Clients = [] })); return Task.CompletedTask;
});
await Test("sync idempotence, durable intent, refresh, transitions", () => WithCycle(async (c, h, s, o) =>
{
    var source = new FakeSource([o]);
    var adapter = new FaultAdapter(s, before: () => Assert(h.Get(o.Text("id"))?.Status == "submitting"));
    Assert((await new Engine(c, source, h, adapter).Cycle()).Synced == 1);
    Assert((await new Engine(c, source, h, adapter).Cycle()).Skipped == 1 && source.Reads == 1);
    using var db = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(c.DataDir, "history.sqlite")}"); db.Open();
    Assert(Convert.ToInt32(Storage.Scalar(db, "SELECT count(*) FROM history_events WHERE order_id=$0", o.Text("id"))) == 2);
    Throws(() => Storage.Exec(db, "DELETE FROM history_events"));
}));
await Test("later approval and eligibility refresh", () => WithCycle(async (c, h, s, o) =>
{
    var source = new FakeSource([Order(c, status: "PENDING_REVIEW")]); var engine = new Engine(c, source, h, s);
    Assert((await engine.Cycle()).Synced == 0); source.Orders = [o]; source.Fresh = Order(c, status: "PENDING_REVIEW");
    Assert((await engine.Cycle()).Synced == 0); source.Fresh = o;
    Assert((await engine.Cycle()).Synced == 1);
}));
await Test("bounded retries and manual review", () => WithCycle(async (c, h, s, o) =>
{
    var source = new FakeSource([o]) { Fail = true }; var engine = new Engine(c with { MaxAttempts = 2 }, source, h, s);
    Assert((await engine.Cycle(clock: DateTimeOffset.UtcNow)).Retry == 1);
    Assert((await engine.Cycle(clock: DateTimeOffset.UtcNow.AddDays(1))).Review == 1);
    Assert((await engine.Cycle(clock: DateTimeOffset.UtcNow.AddDays(2))).Skipped == 1);
}));
foreach (var fault in new[] { "before", "after", "invalid", "unknown", "lookup-invalid" })
    await Test("reconcile create " + fault, () => WithCycle(async (c, h, s, o) =>
    {
        var a = new FaultAdapter(s, fault); var result = await new Engine(c, new FakeSource([o]), h, a).Cycle();
        Assert(fault == "before" ? result.Retry == 1 : fault is "unknown" or "lookup-invalid" ? result.Review == 1 : result.Synced == 1);
    }));
foreach (bool committed in new[] { false, true })
    await Test("restart recovery " + committed, () => WithCycle(async (c, h, s, o) =>
    {
        var payload = Engine.Map(o, c); if (committed) await s.Create(payload);
        h.Save(new(o.Text("id"), payload.ExternalId, "submitting", 1, DateTimeOffset.UtcNow.ToString("O"), Payload: payload));
        var result = await new Engine(c, new FakeSource([]), h, s).Cycle(); Assert(committed ? result.Synced == 1 : result.Retry == 1);
    }));
await Test("unsafe stored destination never reconciled", () => WithCycle(async (c, h, s, o) =>
{
    var p = Engine.Map(o, c) with { Company = "other" }; h.Save(new(o.Text("id"), p.ExternalId, "submitting", 1, DateTimeOffset.UtcNow.ToString("O"), Payload: p));
    Assert((await new Engine(c, new FakeSource([]), h, s).Cycle()).Review == 1);
}));
await Test("simulator persistence and company isolation", async () =>
{
    var c = C(); var p = Engine.Map(Order(c), c); Receipt r;
    using (var s = new Simulator(c.DataDir)) { r = await s.Create(p); Assert((await s.Create(p)) == r); }
    using var reopened = new Simulator(c.DataDir); Assert((await reopened.Lookup(p.ExternalId, c.Company)).Receipt == r);
    Assert((await reopened.Lookup(p.ExternalId, "other")).Status == "absent");
});
await Test("history lock, read-only inspection and identity", () =>
{
    var c = C(); using (var h = new History(c))
    {
        h.BindAdapter(c); Throws(() => new History(c));
        using var reader = new History(c, true); reader.BindAdapter(c, true); Assert(reader.List().Length == 1);
        Throws(() => h.BindAdapter(c with { Adapter = new("other") }));
    }
    using var reopened = new History(c); Assert(reopened.Get("__adapter_identity__") != null);
    Throws(() => new History(c with { Company = "different" }));
    return Task.CompletedTask;
});
await Test("process death releases company lock", async () =>
{
    var company = "process-" + Guid.NewGuid();
    var start = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true };
    start.ArgumentList.Add(typeof(FakeSource).Assembly.Location); start.ArgumentList.Add("lock-child"); start.ArgumentList.Add(company);
    using var child = Process.Start(start)!; Assert(await child.StandardOutput.ReadLineAsync() == "locked");
    Throws(() => new CompanyLock(company)); child.Kill(); await child.WaitForExitAsync(); using var recovered = new CompanyLock(company);
});
await Test("HTTP pagination filters, full rescans and rotating token file", async () =>
{
    var c = C() with { PageSize = 1 }; var o = Order(c); var seen = new List<string>(); int calls = 0;
    var tokenFile = Path.Combine(temp, "token"); File.WriteAllText(tokenFile, "one");
    Environment.SetEnvironmentVariable("MICROSIP_SYNC_TOKEN_FILE", tokenFile);
    var handler = new Handler(req =>
    {
        seen.Add(req.Headers.Authorization!.Parameter!); var query = req.RequestUri!.Query; calls++;
        Assert(query.Contains("created_filter=range") && !query.Contains("status="));
        File.WriteAllText(tokenFile, "two"); return query.Contains("offset=0") ? "[" + o.GetRawText() + "]" : "[]";
    });
    using var http = new HttpClient(handler); var source = new Source(c, http); int count = 0;
    await foreach (var _ in source.List()) count++; await foreach (var _ in source.List()) count++;
    Assert(count == 2 && calls == 4 && seen[0] == "one" && seen[1] == "two");
    Environment.SetEnvironmentVariable("MICROSIP_SYNC_TOKEN_FILE", null);
});
foreach (var mode in new[] { "repeat", "organization", "oversized", "reverse", "duplicate", "shape", "http" })
    await Test("HTTP rejects " + mode, async () =>
    {
        var c = C() with { PageSize = mode is "oversized" or "repeat" ? 1 : 2 };
        var o = Order(c); var o2 = Order(c, "00000000-0000-4000-8000-000000000011");
        string body = mode switch
        {
            "organization" => "[" + Change(o, c.OrganizationId, Guid.NewGuid().ToString()).GetRawText() + "]",
            "reverse" => "[" + o2.GetRawText() + "," + o.GetRawText() + "]",
            "duplicate" or "oversized" => "[" + o.GetRawText() + "," + o.GetRawText() + "]",
            "shape" => "{}",
            _ => "[" + o.GetRawText() + "]"
        };
        using var http = new HttpClient(new Handler(_ => body, mode == "http" ? HttpStatusCode.Unauthorized : HttpStatusCode.OK));
        var source = new Source(c, http, () => Task.FromResult("test")); await Reject(async () => { await foreach (var _ in source.List()) { } });
    });
await Test("API envelope and exact UTC cutoff", async () =>
{
    var c = C() with { Since = "2026-11-16T12:00:00Z" }; var o = Order(c);
    var old = Change(Order(c, "00000000-0000-4000-8000-000000000009"), c.Since, "2026-11-16T11:59:59Z");
    using var http = new HttpClient(new Handler(_ => "{\"data\":[" + old.GetRawText() + "," + o.GetRawText() + "],\"total\":2}"));
    int count = 0; await foreach (var _ in new Source(c, http, () => Task.FromResult("test")).List()) count++; Assert(count == 1);
});
foreach (var stage in new[] { "before", "after" })
    await Test("process crash " + stage + " durable simulator commit", async () =>
    {
        var c = C(); var start = new ProcessStartInfo("dotnet");
        foreach (var arg in new[] { typeof(FakeSource).Assembly.Location, "crash-child", stage, c.DataDir }) start.ArgumentList.Add(arg);
        using var child = Process.Start(start)!; await child.WaitForExitAsync(); Assert(child.ExitCode == 13);
        using var h = new History(c); using var sim = new Simulator(c.DataDir);
        Assert(h.Get(Order(c).Text("id"))?.Status == "submitting");
        var engine = new Engine(c, new FakeSource([]), h, sim); var result = await engine.Cycle();
        Assert(stage == "after" ? result.Synced == 1 : result.Retry == 1);
        if (stage == "before") Assert((await new Engine(c, new FakeSource([Order(c)]), h, sim).Cycle(clock: DateTimeOffset.UtcNow.AddDays(1))).Synced == 1);
        Assert((await sim.Create(Engine.Map(Order(c), c))).Folio == "SIM-00000001");
    });
await Test("interrupted write stays in review even after late commit", () => WithCycle(async (c, h, s, o) =>
{
    using var stop = new CancellationTokenSource();
    var adapter = new InterruptedAdapter(s, stop);
    Assert((await new Engine(c, new FakeSource([o]), h, adapter).Cycle(stop.Token)).Review == 1);
    await s.Create(Engine.Map(o, c));
    Assert((await new Engine(c, new FakeSource([o]), h, s).Cycle()).Skipped == 1);
    Assert((await s.Lookup(Engine.Reference(c, o.Text("id")), c.Company)).Receipt!.Folio == "SIM-00000001");
}));
await Test("CLI HTTP cycle, history, resolve and confirmed retry", async () =>
{
    var c = C(); var o = Order(c);
    var socket = new System.Net.Sockets.TcpListener(IPAddress.Loopback, 0); socket.Start(); var port = ((IPEndPoint)socket.LocalEndpoint).Port; socket.Stop();
    using var listener = new HttpListener(); listener.Prefixes.Add($"http://127.0.0.1:{port}/"); listener.Start();
    c = c with { ApiBaseUrl = $"http://127.0.0.1:{port}" }; var configPath = Path.Combine(temp, "cli.json"); File.WriteAllText(configPath, Json.Encode(c));
    Environment.SetEnvironmentVariable("MICROSIP_SYNC_API_TOKEN", "temporary-test-token");
    var serving = Task.Run(async () =>
    {
        try { while (listener.IsListening) { var ctx = await listener.GetContextAsync(); var body = ctx.Request.Url!.AbsolutePath == "/orders" ? "[" + o.GetRawText() + "]" : o.GetRawText(); var data = Encoding.UTF8.GetBytes(body); ctx.Response.ContentType = "application/json"; ctx.Response.ContentLength64 = data.Length; await ctx.Response.OutputStream.WriteAsync(data); ctx.Response.Close(); } }
        catch (HttpListenerException) { }
        catch (ObjectDisposedException) { }
    });
    async Task<(int Code, string Output)> Cli(params string[] arguments)
    {
        var start = new ProcessStartInfo("dotnet") { RedirectStandardOutput = true, RedirectStandardError = true };
        start.ArgumentList.Add(Path.GetFullPath("dotnet/Cli/bin/Release/net10.0/Microsip.Sync.dll"));
        foreach (var a in arguments) start.ArgumentList.Add(a); start.ArgumentList.Add("--config"); start.ArgumentList.Add(configPath);
        using var process = Process.Start(start)!; var output = process.StandardOutput.ReadToEndAsync(); var error = process.StandardError.ReadToEndAsync(); await process.WaitForExitAsync(); await error; return (process.ExitCode, await output);
    }
    try
    {
        var once = await Cli("once"); Assert(once.Code == 0 && once.Output.Contains("\"synced\":1"));
        var again = await Cli("once"); Assert(again.Code == 0 && again.Output.Contains("\"skipped\":1"));
        var hist = await Cli("history"); Assert(hist.Code == 0 && hist.Output.Contains("SIM-00000001") && !hist.Output.Contains("productKey"));
        var id = "00000000-0000-4000-8000-000000000099";
        using (var h = new History(c)) h.Save(new(id, Engine.Reference(c, id), "review", 5, DateTimeOffset.UtcNow.ToString("O")));
        Assert((await Cli("retry", id, "unconfirmed")).Code != 0);
        Assert((await Cli("retry", id, "--confirmed-absent")).Code == 0);
        using (var h = new History(c)) Assert(h.Get(id)!.Attempts == 0);
        Assert((await Cli("resolve", id, "REAL-TEST-FOLIO")).Code == 0);
        using (var h = new History(c)) Assert(h.Get(id)!.Receipt!.Folio == "REAL-TEST-FOLIO");
    }
    finally { listener.Stop(); await serving; Environment.SetEnvironmentVariable("MICROSIP_SYNC_API_TOKEN", null); }
});
if (args.Length == 2 && args[0] == "fixture")
    await Test("Node SQLite fixture reused by .NET", async () =>
    {
        var c = C() with { DataDir = Path.GetFullPath(args[1]) };
        using var h = new History(c); h.BindAdapter(c); using var s = new Simulator(c.DataDir);
        var entry = h.Get("00000000-0000-4000-8000-000000000010")!;
        Assert(entry.Status == "submitting"); Assert((await new Engine(c, new FakeSource([]), h, s).Cycle()).Synced == 1);
        Assert((await s.Create(entry.Payload!)).Folio == "SIM-00000001");
    });
Console.WriteLine($"{passed} passed; {failed} failed");
Directory.Delete(temp, true);
return failed == 0 ? 0 : 1;

sealed class FakeSource(JsonElement[] orders) : ISource
{
    public JsonElement[] Orders = orders; public JsonElement? Fresh; public bool Fail; public int Reads;
    public async IAsyncEnumerable<JsonElement> List([EnumeratorCancellation] CancellationToken cancellationToken = default) { await Task.CompletedTask; foreach (var o in Orders) yield return o; }
    public Task<JsonElement> Get(string id, CancellationToken cancellationToken = default) { Reads++; if (Fail) throw new Exception(); return Task.FromResult(Fresh ?? Orders.Single(o => o.Text("id") == id)); }
}
sealed class FaultAdapter(IAdapter inner, string fault = "", Action? before = null) : IAdapter
{
    public Task Validate(DestinationOrder o) => inner.Validate(o);
    public async Task<Receipt> Create(DestinationOrder o)
    {
        before?.Invoke(); if (fault is "before" or "unknown" or "lookup-invalid") throw new Exception();
        var r = await inner.Create(o); if (fault == "after") throw new Exception(); return fault == "invalid" ? new("", "bad") : r;
    }
    public Task<Lookup> Lookup(string id, string company) => fault is "unknown" or "lookup-invalid" ? Task.FromResult(new Lookup(fault == "unknown" ? "unknown" : "found", new("", "bad"))) : inner.Lookup(id, company);
    public void Dispose() { }
}
sealed class Handler(Func<HttpRequestMessage, string> body, HttpStatusCode status = HttpStatusCode.OK) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(body(request), Encoding.UTF8, "application/json") });
}
sealed class CrashAdapter(IAdapter inner, string stage) : IAdapter
{
    public Task Validate(DestinationOrder o) => inner.Validate(o);
    public async Task<Receipt> Create(DestinationOrder o)
    {
        if (stage == "before") Environment.Exit(13);
        var receipt = await inner.Create(o); Environment.Exit(13); return receipt;
    }
    public Task<Lookup> Lookup(string id, string company) => inner.Lookup(id, company);
    public void Dispose() { }
}

sealed class InterruptedAdapter(IAdapter inner, CancellationTokenSource stop) : IAdapter
{
    public Task Validate(DestinationOrder o) => inner.Validate(o);
    public Task<Receipt> Create(DestinationOrder o) { stop.Cancel(); return new TaskCompletionSource<Receipt>().Task; }
    public Task<Lookup> Lookup(string id, string company) => Task.FromResult(new Lookup("absent"));
    public void Dispose() { }
}
