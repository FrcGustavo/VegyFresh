using System.Runtime.InteropServices;

namespace Microsip.Diagnostic;

// API 2026: ApiMspBasicaExt.pas declares stdcall and PAnsiChar.
// Only connection and resource management are exposed by this diagnostic.
internal static class NativeApi
{
    internal const string Library = "ApiMicrosip.dll";

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
    internal static extern IntPtr LoadLibraryExW(string fileName, IntPtr file, uint flags);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern void SetErrorHandling(int exceptionOnError, int messageOnException);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern int NewDB();

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern int NewTrn(int database, int type);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int DBConnect(int database, string path, string user, string password);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern int DBConnected(int database);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern int DBDisconnect(int database);

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern int GetLastErrorCode();

    [DllImport(Library, CallingConvention = CallingConvention.StdCall, ExactSpelling = true)]
    internal static extern void LiberarRecursos();
}
