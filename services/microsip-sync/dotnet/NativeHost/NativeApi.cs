using System.Runtime.InteropServices;
using Microsip.Sync;

// API 2026 Pascal declarations + Ventas manual, pages 7–11. Only used exports.
internal sealed class NativeApi : INativeApi
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
    internal static extern IntPtr LoadLibraryExW(string fileName, IntPtr file, uint flags);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern void SetErrorHandling(int exceptionOnError, int messageOnException);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern void veSetErrorHandling(int exceptionOnError, int messageOnException);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int NewDB();
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int NewTrn(int database, int type);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int DBConnect(int database, string path, string user, string password);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int SetDBVentas(int database);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int NuevoPedido(string date, string folio, int customerId, int addressId, int warehouseId, string deliveryDate, string discountType, double discount, string purchaseOrder, string description, int sellerId, int replacedTaxId, int replacementTaxId, int currencyId, int parameterList);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int RenglonPedido(int articleId, double quantity, double price, double discount, string notes);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int AplicaPedido();
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int GetDoctoVeId(ref int id);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern void AbortaDoctoVentas();
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern int DBDisconnect(int database);
    [DllImport("ApiMicrosip.dll", CallingConvention = CallingConvention.StdCall, ExactSpelling = true,
        CharSet = CharSet.Ansi, BestFitMapping = false, ThrowOnUnmappableChar = true)]
    internal static extern void LiberarRecursos();
    void INativeApi.SetErrorHandling(int exceptionOnError, int messageOnException) => SetErrorHandling(exceptionOnError, messageOnException);
    void INativeApi.SalesErrorHandling(int exceptionOnError, int messageOnException) => veSetErrorHandling(exceptionOnError, messageOnException);
    int INativeApi.NewDB() => NewDB();
    int INativeApi.NewTrn(int database, int type) => NewTrn(database, type);
    int INativeApi.Connect(int database, string path, string user, string password) => DBConnect(database, path, user, password);
    int INativeApi.SetSalesDatabase(int database) => SetDBVentas(database);
    int INativeApi.NewOrder(string date, string folio, int customerId, int addressId, int warehouseId, string deliveryDate, string discountType, double discount, string purchaseOrder, string description, int sellerId, int replacedTaxId, int replacementTaxId, int currencyId, int parameterList) => NuevoPedido(date, folio, customerId, addressId, warehouseId, deliveryDate, discountType, discount, purchaseOrder, description, sellerId, replacedTaxId, replacementTaxId, currencyId, parameterList);
    int INativeApi.Line(int articleId, double quantity, double price, double discount, string notes) => RenglonPedido(articleId, quantity, price, discount, notes);
    int INativeApi.Apply() => AplicaPedido();
    int INativeApi.DocumentId(ref int id) => GetDoctoVeId(ref id);
    void INativeApi.Abort() => AbortaDoctoVentas();
    int INativeApi.Disconnect(int database) => DBDisconnect(database);
    void INativeApi.Free() => LiberarRecursos();
}
