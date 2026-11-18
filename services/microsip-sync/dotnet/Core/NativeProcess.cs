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
                return ReadResponse(await output, process.ExitCode);
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

    internal static NativeResponse ReadResponse(string output, int exitCode)
    {
        NativeResponse response;
        try { response = Json.Decode<NativeResponse>(output); }
        catch (Exception error) when (error is System.Text.Json.JsonException or InvalidDataException)
        {
            throw new NativeOperationException(new(NativeOperation.WorkerResponse));
        }

        if (!response.Ok)
        {
            var applied = response.Stage == "applied-folio-unverified";
            var failure = response.Failure is { } reported && Enum.IsDefined(reported.Operation)
                ? reported
                : applied ? null : new NativeFailure(NativeOperation.WorkerResponse);
            throw new NativeOperationException(failure, applied ? response.DocumentId : null, applied);
        }
        if (exitCode != 0) throw new NativeOperationException(new(NativeOperation.WorkerResponse));
        return response;
    }

    public async Task Validate(DestinationOrder order) { Simulator.Check(order); Json.Decode<NativeConfig>(File.ReadAllText(config.NativeConfigPath!)).Validate(order); await Request("validate", order); }
    public async Task<Receipt> Create(DestinationOrder order) => (await Request("create", order)).Receipt ?? throw new InvalidOperationException("No verified folio returned; review required");
    public Task<Lookup> Lookup(string externalId, string company) => Task.FromResult(new Lookup("unknown"));
    public void Dispose() { disposed = true; if (active is { HasExited: false }) active.Kill(true); }
}
public sealed record NativeRequest(string Operation, DestinationOrder? Order);
public sealed record NativeResponse(bool Ok, Receipt? Receipt = null, string? Stage = null, int? DocumentId = null,
    NativeFailure? Failure = null);

public enum NativeOperation
{
    WorkerConfiguration = 1, LoadLibraryExW, WorkerRequest, WorkerResponse,
    SetErrorHandling, veSetErrorHandling, NewDB, NewTrn, DBConnect, SetDBVentas,
    NuevoPedido, RenglonPedido, AplicaPedido, GetDoctoVeId, AbortaDoctoVentas, DBDisconnect, LiberarRecursos
}

public sealed record NativeFailure(NativeOperation Operation, int? Code = null);

public sealed class NativeOperationException(NativeFailure? failure, int? documentId = null, bool applied = false)
    : Exception
{
    public NativeResponse Response { get; } = new(false,
        Stage: applied ? "applied-folio-unverified" : "failed-or-unknown",
        DocumentId: applied && documentId > 0 ? documentId : null,
        Failure: failure);

    public override string Message
    {
        get
        {
            var message = Response.Stage == "applied-folio-unverified"
                ? "Microsip applied the order. Folio unverified"
                : "Microsip native operation failed";
            if (Response.Failure is { } detail)
                message += $" at {detail.Operation}" + (detail.Code is int code ? $" (return code {code})" : "");
            if (Response.DocumentId is int id) message += $". Internal document ID {id}";
            return message;
        }
    }
}
