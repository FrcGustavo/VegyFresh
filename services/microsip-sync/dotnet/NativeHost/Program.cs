using Microsip.Sync;
using System.Runtime.InteropServices;

if (!OperatingSystem.IsWindows() || Environment.Is64BitProcess || args.Length != 1) return 2;
try
{
    var config = Json.Decode<NativeConfig>(File.ReadAllText(args[0]));
    if (!Path.IsPathFullyQualified(config.DllPath) || !File.Exists(config.DllPath)) throw new InvalidDataException();
    var library = NativeApi.LoadLibraryExW(config.DllPath, IntPtr.Zero, 0x00001100);
    if (library == IntPtr.Zero) throw new DllNotFoundException();
    NativeLibrary.SetDllImportResolver(typeof(NativeApi).Assembly, (name, _, _) => name == "ApiMicrosip.dll" ? library : IntPtr.Zero);
    var request = Json.Decode<NativeRequest>(await Console.In.ReadLineAsync() ?? "");
    string Env(string key) => Environment.GetEnvironmentVariable(key) is { Length: > 0 } value ? value : throw new InvalidDataException();
    var result = new NativeOrder(new NativeApi()).Execute(request, config, Env("MICROSIP_DATABASE"), Env("MICROSIP_USER"), Env("MICROSIP_PASSWORD"));
    Console.WriteLine(Json.Encode(result)); return 0;
}
catch
{
    Console.WriteLine(Json.Encode(new NativeResponse(false, Stage: "failed-or-unknown"))); return 1;
}
