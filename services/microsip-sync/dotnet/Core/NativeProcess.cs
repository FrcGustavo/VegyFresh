using System.Diagnostics;
namespace Microsip.Sync;

// One worker per request: native state never shares an address space with the portable engine.
public sealed class NativeProcess(AdapterConfig config) : IAdapter
{
    readonly SemaphoreSlim serial = new(1);
    Process? active;
    bool disposed;
    async Task<NativeResponse> Request(string operation, DestinationOrder? order)
    {
        await serial.WaitAsync();
        try
        {
            ObjectDisposedException.ThrowIf(disposed, this);
            if (!OperatingSystem.IsWindows()) throw new PlatformNotSupportedException("Microsip requires Windows x86 worker");
            var start = new ProcessStartInfo(config.HostPath!) { UseShellExecute = false, RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
            start.ArgumentList.Add(config.NativeConfigPath!);
            using var process = Process.Start(start) ?? throw new InvalidOperationException("Worker unavailable"); active = process;
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(25));
            var stderr = process.StandardError.ReadToEndAsync(deadline.Token);
            var output = process.StandardOutput.ReadToEndAsync(deadline.Token);
            try
            {
                await process.StandardInput.WriteLineAsync(Json.Encode(new NativeRequest(operation, order)).AsMemory(), deadline.Token);
                process.StandardInput.Close();
                await Task.WhenAll(process.WaitForExitAsync(deadline.Token), stderr, output);
                if (process.ExitCode != 0) throw new InvalidOperationException("Native worker failed");
                var response = Json.Decode<NativeResponse>(await output);
                if (!response.Ok) throw new InvalidOperationException("Native operation failed or outcome unknown");
                return response;
            }
            finally
            {
                try
                {
                    if (!process.HasExited) process.Kill(true);
                }
                catch (InvalidOperationException) when (process.HasExited) { }
                finally { active = null; }
            }
        }
        finally { serial.Release(); }
    }
    public async Task Validate(DestinationOrder order) { Simulator.Check(order); Json.Decode<NativeConfig>(File.ReadAllText(config.NativeConfigPath!)).Validate(order); await Request("validate", order); }
    public async Task<Receipt> Create(DestinationOrder order) => (await Request("create", order)).Receipt ?? throw new InvalidOperationException("No verified folio returned; review required");
    public Task<Lookup> Lookup(string externalId, string company) => Task.FromResult(new Lookup("unknown"));
    public void Dispose() { disposed = true; if (active is { HasExited: false }) active.Kill(true); }
}
public sealed record NativeRequest(string Operation, DestinationOrder? Order);
public sealed record NativeResponse(bool Ok, Receipt? Receipt = null, string? Stage = null, int? DocumentId = null);
