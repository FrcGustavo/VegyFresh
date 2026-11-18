using Microsip.Sync;

using var stop = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; stop.Cancel(); };
try
{
    var index = Array.IndexOf(args, "--config");
    const string usage = "Usage: once|run|history|resolve ID FOLIO|retry ID --confirmed-absent --config file.json";
    if (index < 1 || args.Length != index + 2) throw new ArgumentException(usage);
    var command = args[0];
    if ((command is "once" or "run" or "history") ? index != 1 : (command is "resolve" or "retry") ? index != 3 : true) throw new ArgumentException(usage);
    var config = Config.Load(args[index + 1]);
    using var history = new History(config, command == "history");
    history.BindAdapter(config, command == "history");
    if (command == "history")
    {
        Console.WriteLine(Json.Encode(history.List().Where(e => e.OrderId != "__adapter_identity__").Select(e => e with { Payload = null }))); return 0;
    }
    if (command is "resolve" or "retry")
    {
        var e = history.Get(args[1]); var now = DateTimeOffset.UtcNow.ToString("O");
        if (e == null || e.OrderId == "__adapter_identity__" || e.Status == "synced") throw new InvalidOperationException("Missing or already synced order");
        if (command == "resolve")
        {
            if (string.IsNullOrWhiteSpace(args[2])) throw new ArgumentException(usage);
            e = e with { Status = "synced", UpdatedAt = now, Receipt = new(args[2].Trim(), now), Error = null, NextAttemptAt = null };
        }
        else
        {
            if (args[2] != "--confirmed-absent" || e.Status == "submitting") throw new InvalidOperationException("Reconcile first and confirm absence");
            e = e with { Status = "retry", Attempts = 0, UpdatedAt = now, NextAttemptAt = now, Receipt = null, Error = "Absence manually confirmed by operator" };
        }
        history.Save(e); Console.WriteLine(Json.Encode(new { e.OrderId, e.Status })); return 0;
    }
    using IAdapter adapter = new Simulator(config.DataDir);
    using var http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(15) };
    var engine = new Engine(config, new Source(config, http), history, adapter);
    do
    {
        try { Console.WriteLine(Json.Encode(await engine.Cycle(stop.Token))); }
        catch (OperationCanceledException) when (stop.IsCancellationRequested) { break; }
        catch when (command == "run") { Console.Error.WriteLine("Cycle failed; check API configuration and connectivity"); }
        if (command == "once") break;
        await Task.Delay(config.PollIntervalMs, stop.Token);
    } while (!stop.IsCancellationRequested);
    return 0;
}
catch (OperationCanceledException) when (stop.IsCancellationRequested) { return 0; }
catch (Exception e)
{
    // Do not expose provider messages, tokens, connection strings or response bodies.
    Console.Error.WriteLine($"Synchronization failed ({e.GetType().Name}); verify configuration, local history and connectivity."); return 1;
}
