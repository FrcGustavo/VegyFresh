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
    public NativeResponse Execute(NativeRequest request, NativeConfig config, string databasePath, string user, string password)
    {
        if (request.Operation is not ("validate" or "create") || request.Order == null) throw new InvalidDataException("Invalid native request");
        var order = request.Order;
        config.Validate(order);
        var database = -1;
        var initialized = false;
        var writing = false;
        var applied = false;
        int? documentId = null;
        NativeFailure? failure = null;
        var operation = NativeOperation.SetErrorHandling;

        void Check(int code, bool rejected)
        {
            if (!rejected) return;
            failure ??= new(operation, code);
            throw new NativeOperationException(failure, documentId, applied);
        }

        void CheckStatus(int code) => Check(code, code != 0);

        void Cleanup(NativeOperation cleanupOperation, Action action)
        {
            operation = cleanupOperation;
            try { action(); }
            catch { failure ??= new(operation); }
        }

        try
        {
            api.SetErrorHandling(0, 0);
            initialized = true;
            operation = NativeOperation.veSetErrorHandling;
            api.SalesErrorHandling(0, 0);
            operation = NativeOperation.NewDB;
            database = api.NewDB();
            Check(database, database < 0);
            operation = NativeOperation.NewTrn;
            var transaction = api.NewTrn(database, 1);
            Check(transaction, transaction < 0);
            operation = NativeOperation.DBConnect;
            CheckStatus(api.Connect(database, databasePath, user, password));
            operation = NativeOperation.SetDBVentas;
            CheckStatus(api.SetSalesDatabase(database));
            if (request.Operation == "create")
            {
                var customer = config.Customers[order.CustomerKey];
                writing = true; // Even header failure can leave native state needing an abort.
                operation = NativeOperation.NuevoPedido;
                CheckStatus(api.NewOrder(DateTime.Today.ToString("d/M/yyyy", CultureInfo.InvariantCulture), "", customer.CustomerId,
                    customer.AddressId, config.WarehouseId, "", "P", 0, "", order.ExternalId, 0, 0, 0, 0, -1));
                operation = NativeOperation.RenglonPedido;
                foreach (var line in order.Lines)
                    CheckStatus(api.Line(config.Products[line.ProductKey].ArticleId, (double)line.Quantity, -1, -1, ""));
                operation = NativeOperation.AplicaPedido;
                CheckStatus(api.Apply());
                writing = false;
                applied = true;
                operation = NativeOperation.GetDoctoVeId;
                var id = 0;
                CheckStatus(api.DocumentId(ref id));
                if (id <= 0) throw new InvalidDataException("Missing native document ID");
                documentId = id;
            }
        }
        catch
        {
            failure ??= new(operation);
        }
        finally
        {
            // Keep the original failure even if disconnect or resource release also fails.
            if (writing) Cleanup(NativeOperation.AbortaDoctoVentas, api.Abort);
            if (database >= 0) Cleanup(NativeOperation.DBDisconnect, () => CheckStatus(api.Disconnect(database)));
            if (initialized) Cleanup(NativeOperation.LiberarRecursos, api.Free);
        }

        if (failure != null) throw new NativeOperationException(failure, documentId, applied);
        // The document ID is useful for review while the assigned folio remains unverified.
        return applied
            ? new(false, Stage: "applied-folio-unverified", DocumentId: documentId)
            : new(true, Stage: "validated-local-mappings-and-connection");
    }
}
