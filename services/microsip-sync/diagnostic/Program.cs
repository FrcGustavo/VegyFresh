using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text.Json;
using Microsip.Diagnostic;

static void Report(string stage, object data) =>
    Console.WriteLine(JsonSerializer.Serialize(new { stage, data }));

if (args.Length != 2 || (args[0] != "inspect" && args[0] != "connect"))
{
    Console.Error.WriteLine("Uso: Microsip.Diagnostic.exe inspect|connect RUTA_ABSOLUTA_DLL");
    return 2;
}
if (!OperatingSystem.IsWindows() || Environment.Is64BitProcess)
{
    Report("platform", new { ok = false, required = "Windows x86" });
    return 2;
}

var database = -1;
var initialized = false;
var exitCode = 1;
try
{
    if (!Path.IsPathFullyQualified(args[1]) || !File.Exists(args[1]))
        throw new ArgumentException();
    var path = Path.GetFullPath(args[1]);
    var version = FileVersionInfo.GetVersionInfo(path);
    using (var stream = File.OpenRead(path))
        Report("file", new { version = version.FileVersion, productVersion = version.ProductVersion,
            sha256 = Convert.ToHexString(SHA256.HashData(stream)) });

    // Search dependencies beside the vendor DLL and in System32, excluding the working directory.
    var library = NativeApi.LoadLibraryExW(path, IntPtr.Zero, 0x00001100);
    if (library == IntPtr.Zero)
    {
        Report("load", new { ok = false, windowsError = Marshal.GetLastWin32Error() });
        return 1;
    }
    // Keep the module loaded until process exit: vendor finalization may use its dependencies.
    NativeLibrary.SetDllImportResolver(typeof(NativeApi).Assembly,
        (name, assembly, searchPath) => name == NativeApi.Library ? library : IntPtr.Zero);
    foreach (var name in new[] { "SetErrorHandling", "NewDB", "NewTrn", "DBConnect",
        "DBConnected", "DBDisconnect", "GetLastErrorCode", "LiberarRecursos" })
        if (!NativeLibrary.TryGetExport(library, name, out _))
            throw new EntryPointNotFoundException();
    Report("load", new { ok = true, architecture = "x86" });
    if (args[0] == "inspect") return 0;

    var target = Environment.GetEnvironmentVariable("MICROSIP_DIAG_DATABASE");
    var user = Environment.GetEnvironmentVariable("MICROSIP_DIAG_USER");
    var password = Environment.GetEnvironmentVariable("MICROSIP_DIAG_PASSWORD");
    if (string.IsNullOrWhiteSpace(target) || string.IsNullOrWhiteSpace(user) || string.IsNullOrEmpty(password))
    {
        Report("config", new { ok = false, required = "MICROSIP_DIAG_DATABASE, MICROSIP_DIAG_USER, MICROSIP_DIAG_PASSWORD" });
        return 2;
    }
    NativeApi.SetErrorHandling(0, 0);
    initialized = true;
    database = NativeApi.NewDB();
    if (database < 0) throw new InvalidOperationException();
    // Type 1 is the documented read-only ReadCommittedRecVer transaction. Never start or commit it.
    if (NativeApi.NewTrn(database, 1) < 0) throw new InvalidOperationException();
    var result = NativeApi.DBConnect(database, target, user, password);
    Report("connect", new { ok = result == 0, code = result,
        license = result == 0 ? "available" : result == 6 ? "check-failed" : "unconfirmed" });
    if (result == 0)
    {
        var connected = NativeApi.DBConnected(database);
        var error = NativeApi.GetLastErrorCode();
        Report("connected", new { ok = connected == 1 && error == 0, code = error });
        exitCode = connected == 1 && error == 0 ? 0 : 1;
    }
}
catch (Exception exception)
{
    // Native/provider messages may contain paths, usernames or connection strings.
    Report("error", new { ok = false, kind = exception.GetType().Name });
}
finally
{
    if (initialized)
    {
        try
        {
            if (database >= 0)
            {
                var result = NativeApi.DBDisconnect(database);
                Report("disconnect", new { ok = result == 0, code = result });
                if (result != 0) exitCode = 1;
            }
        }
        catch (Exception exception)
        {
            Report("disconnect", new { ok = false, kind = exception.GetType().Name });
            exitCode = 1;
        }
        finally
        {
            try { NativeApi.LiberarRecursos(); }
            catch (Exception exception)
            {
                Report("cleanup", new { ok = false, kind = exception.GetType().Name });
                exitCode = 1;
            }
        }
    }
}
return exitCode;
