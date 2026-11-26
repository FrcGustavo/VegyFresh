namespace Microsip.Sync.Desktop;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        using var instance = new Mutex(true, @"Local\VegyFresh.MicrosipSync.Desktop", out var firstInstance);
        if (!firstInstance)
        {
            MessageBox.Show("La ventana de sincronización ya está abierta.", "VegyFresh · Microsip");
            return;
        }

        Application.Run(new CatalogImportForm());
    }
}
