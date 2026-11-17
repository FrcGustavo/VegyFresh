using System.Globalization;
namespace Microsip.Sync;

public sealed record NativeCustomer(int CustomerId, int AddressId = 0);
public sealed record NativeProduct(int ArticleId, string Unit);
public sealed record NativeConfig(string DllPath, string Company, string Branch, string Warehouse, int WarehouseId,
    Dictionary<string, NativeCustomer> Customers, Dictionary<string, NativeProduct> Products, bool CatalogMappingsVerified = false)
{
    public void Validate(DestinationOrder order)
    {
        Simulator.Check(order);
        if (!CatalogMappingsVerified) throw new MappingException("Local catalog mappings must be verified against the test company");
        if (Company != order.Company || Branch != order.Branch || Warehouse != order.Warehouse || WarehouseId <= 0) throw new MappingException("Native destination mapping missing");
        if (!Customers.TryGetValue(order.CustomerKey, out var customer) || customer.CustomerId <= 0 || customer.AddressId < 0) throw new MappingException("Native customer ID missing");
        foreach (var line in order.Lines)
            if (!Products.TryGetValue(line.ProductKey, out var product) || product.ArticleId <= 0 || product.Unit != line.Unit)
                throw new MappingException("Exact product folio or unit mapping missing");
        // Reference is ASCII and is never truncated to fit a folio or purchase order field.
        if (order.ExternalId.Length > 128 || order.ExternalId.Any(c => c > 127)) throw new InvalidDataException("Invalid external reference");
    }
}
public interface INativeApi
{
    void SetErrorHandling(int exceptionOnError, int messageOnException);
    void SalesErrorHandling(int exceptionOnError, int messageOnException);
    int NewDB();
    int NewTrn(int database, int type);
    int Connect(int database, string path, string user, string password);
    int SetSalesDatabase(int database);
    int NewOrder(string date, string folio, int customerId, int addressId, int warehouseId, string deliveryDate,
        string discountType, double discount, string purchaseOrder, string description, int sellerId,
        int replacedTaxId, int replacementTaxId, int currencyId, int parameterList);
    int Line(int articleId, double quantity, double price, double discount, string notes);
    int Apply();
    int DocumentId(ref int id);
    void Abort();
    int Disconnect(int database);
    void Free();
}
public sealed class NativeOrder(INativeApi api)
{
    static void Success(int code) { if (code != 0) throw new InvalidOperationException("Native operation rejected"); }
    public NativeResponse Execute(NativeRequest request, NativeConfig config, string databasePath, string user, string password)
    {
        if (request.Operation is not ("validate" or "create") || request.Order == null) throw new InvalidDataException("Invalid native request");
        var order = request.Order; config.Validate(order);
        int database = -1; bool initialized = false, writing = false;
        try
        {
            api.SetErrorHandling(0, 0); initialized = true; api.SalesErrorHandling(0, 0);
            database = api.NewDB(); if (database < 0) throw new InvalidOperationException("Native database unavailable");
            if (api.NewTrn(database, 1) < 0) throw new InvalidOperationException("Native transaction unavailable");
            Success(api.Connect(database, databasePath, user, password));
            Success(api.SetSalesDatabase(database));
            if (request.Operation == "validate") return new(true, Stage: "validated-local-mappings-and-connection");
            var customer = config.Customers[order.CustomerKey];
            writing = true; // Even header failure can leave native state needing an abort.
            Success(api.NewOrder(DateTime.Today.ToString("d/M/yyyy", CultureInfo.InvariantCulture), "", customer.CustomerId,
                customer.AddressId, config.WarehouseId, "", "P", 0, "", order.ExternalId, 0, 0, 0, 0, -1));
            foreach (var line in order.Lines)
                Success(api.Line(config.Products[line.ProductKey].ArticleId, (double)line.Quantity, -1, -1, ""));
            Success(api.Apply()); writing = false;
            var id = 0; Success(api.DocumentId(ref id));
            if (id <= 0) throw new InvalidOperationException("Missing native document ID");
            // The documented subset provides a document ID, not its assigned folio.
            // Do not fabricate a receipt from that ID. An operator must verify the folio.
            return new(false, Stage: "applied-folio-unverified", DocumentId: id);
        }
        finally
        {
            try { if (writing) api.Abort(); }
            finally
            {
                try { if (database >= 0) Success(api.Disconnect(database)); }
                finally { if (initialized) api.Free(); }
            }
        }
    }
}
