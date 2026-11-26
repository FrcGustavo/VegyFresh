using System.Text.Json;

namespace Microsip.Sync.Desktop;

internal sealed class CatalogImportForm : Form
{
    private static readonly string ConfigPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "VegyFresh", "MicrosipSync", "catalog-import.json");

    private readonly TextBox _apiUrl = new() { Dock = DockStyle.Fill };
    private readonly TextBox _organization = new() { Dock = DockStyle.Fill };
    private readonly TextBox _company = new() { Dock = DockStyle.Fill };
    private readonly TextBox _tokenFile = new() { Dock = DockStyle.Fill };
    private readonly TextBox _sourceFile = new() { Dock = DockStyle.Fill, ReadOnly = true };
    private readonly Label _lastSuccess = new() { AutoSize = true };
    private readonly Label _status = new() { AutoSize = true, MaximumSize = new(650, 0) };
    private readonly Label[] _counts = new Label[12];
    private readonly Button _sync = new() { Text = "Sincronizar", AutoSize = true };
    private readonly TableLayoutPanel _settings = new()
    {
        ColumnCount = 3,
        Dock = DockStyle.Top,
        AutoSize = true
    };
    private CatalogImportConfig? _savedConfig;
    private bool _busy;

    public CatalogImportForm()
    {
        Text = "VegyFresh · Catálogos de Microsip";
        AutoScaleMode = AutoScaleMode.Dpi;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new(740, 550);
        MinimumSize = new(660, 480);
        AutoScroll = true;

        var layout = new TableLayoutPanel
        {
            ColumnCount = 1,
            Dock = DockStyle.Top,
            AutoSize = true,
            Padding = new(24)
        };
        layout.ColumnStyles.Add(new(SizeType.Percent, 100));
        layout.Controls.Add(new Label
        {
            AutoSize = true,
            Text = "Sincronización de catálogos",
            Font = new Font(Font.FontFamily, 16, FontStyle.Bold),
            Margin = new(3, 0, 3, 12)
        });
        layout.Controls.Add(_lastSuccess);
        layout.Controls.Add(_settings);
        _settings.Margin = new(0, 14, 0, 8);
        _settings.ColumnStyles.Add(new(SizeType.AutoSize));
        _settings.ColumnStyles.Add(new(SizeType.Percent, 100));
        _settings.ColumnStyles.Add(new(SizeType.AutoSize));
        AddField("URL de la API", _apiUrl);
        AddField("Organización (UUID)", _organization);
        AddField("Clave de empresa Microsip", _company);
        AddField("Archivo de token", _tokenFile, BrowseToken);
        AddField("Archivo de catálogos", _sourceFile, BrowseSource);

        var actions = new FlowLayoutPanel { AutoSize = true, Dock = DockStyle.Top };
        var save = new Button { Text = "Guardar configuración", AutoSize = true };
        actions.Controls.Add(_sync);
        actions.Controls.Add(save);
        layout.Controls.Add(actions);

        _status.Margin = new(3, 10, 3, 10);
        layout.Controls.Add(_status);
        layout.Controls.Add(CreateResults());
        Controls.Add(layout);

        save.Click += async (_, _) => await RunBusy(actions, SaveSettings);
        _sync.Click += async (_, _) => await RunBusy(actions, Synchronize);
        Shown += async (_, _) => await RunBusy(actions, LoadSettings);
        FormClosing += (_, args) => args.Cancel = _busy;
        SetLastSuccess(null);
    }

    private void AddField(string name, TextBox field, EventHandler? browse = null)
    {
        var row = _settings.RowCount++;
        _settings.Controls.Add(new Label { Text = name, AutoSize = true, Anchor = AnchorStyles.Left }, 0, row);
        _settings.Controls.Add(field, 1, row);
        if (browse is not null)
        {
            var button = new Button { Text = "Examinar…", AutoSize = true };
            button.Click += browse;
            _settings.Controls.Add(button, 2, row);
        }
    }

    private TableLayoutPanel CreateResults()
    {
        var table = new TableLayoutPanel { ColumnCount = 4, Dock = DockStyle.Top, AutoSize = true };
        table.ColumnStyles.Add(new(SizeType.Percent, 37));
        for (var column = 1; column < 4; column++)
            table.ColumnStyles.Add(new(SizeType.Percent, 21));

        string[] headings = ["Catálogo", "Creados", "Actualizados", "Sin cambios"];
        string[] resources = ["Productos", "Listas de precios", "Precios", "Clientes"];
        for (var column = 0; column < headings.Length; column++)
            table.Controls.Add(new Label { Text = headings[column], AutoSize = true }, column, 0);

        for (var row = 0; row < resources.Length; row++)
        {
            table.Controls.Add(new Label { Text = resources[row], AutoSize = true }, 0, row + 1);
            for (var column = 0; column < 3; column++)
            {
                var count = new Label { Text = "—", AutoSize = true };
                _counts[row * 3 + column] = count;
                table.Controls.Add(count, column + 1, row + 1);
            }
        }

        return table;
    }

    private void BrowseToken(object? sender, EventArgs args) =>
        Browse(_tokenFile, "Seleccionar archivo de token", "Todos los archivos|*.*");

    private void BrowseSource(object? sender, EventArgs args) =>
        Browse(_sourceFile, "Seleccionar archivo de catálogos", "Archivos JSON|*.json");

    private void Browse(TextBox field, string title, string filter)
    {
        using var dialog = new OpenFileDialog { Title = title, Filter = filter, RestoreDirectory = true };
        if (dialog.ShowDialog(this) == DialogResult.OK)
            field.Text = dialog.FileName;
    }

    private async Task RunBusy(Control actions, Func<Task> action)
    {
        if (_busy)
            return;

        _busy = true;
        _settings.Enabled = false;
        actions.Enabled = false;
        UseWaitCursor = true;
        try
        {
            await action();
        }
        catch (Exception error)
        {
            var reason = error switch
            {
                CatalogImportException => TranslateError(error.Message),
                JsonException => "La configuración no contiene un JSON válido.",
                IOException or UnauthorizedAccessException => "No se pudo acceder a un archivo local de la sincronización.",
                _ => "No se pudo completar la sincronización."
            };
            if (_savedConfig is not null)
            {
                try
                {
                    using var client = new CatalogImportClient(_savedConfig);
                    if (client.HasPendingApply())
                        reason += " El envío puede haberse aplicado. Selecciona el mismo archivo y pulsa Sincronizar para recuperar el resultado.";
                }
                catch (Exception) { /* Preserve the original actionable error when local state is unavailable. */ }
            }
            _status.Text = reason;
        }
        finally
        {
            _busy = false;
            _settings.Enabled = true;
            actions.Enabled = true;
            UseWaitCursor = false;
        }
    }

    private async Task LoadSettings()
    {
        if (!File.Exists(ConfigPath))
        {
            _status.Text = "Configura la conexión y selecciona el archivo de catálogos.";
            return;
        }

        var config = await Task.Run(() => CatalogImportConfig.Load(ConfigPath));
        _savedConfig = config;
        _apiUrl.Text = config.ApiBaseUrl;
        _organization.Text = config.OrganizationId;
        _company.Text = config.Company;
        _tokenFile.Text = config.TokenFile ?? "";
        await ShowLocalState(config, "Selecciona el archivo de catálogos.");
    }

    private async Task SaveSettings()
    {
        var config = await SaveConfig();
        await ShowLocalState(config, "Configuración guardada.");
    }

    private async Task<CatalogImportConfig> SaveConfig()
    {
        var apiBaseUrl = _apiUrl.Text.Trim();
        var organizationId = _organization.Text.Trim();
        var company = _company.Text.Trim();
        var tokenFile = _tokenFile.Text.Trim();
        var previous = _savedConfig;
        var config = await Task.Run(() => StoreConfig(apiBaseUrl, organizationId, company, tokenFile, previous));
        _savedConfig = config;
        return config;
    }

    private static CatalogImportConfig StoreConfig(string apiBaseUrl, string organizationId,
        string company, string tokenFile, CatalogImportConfig? previous)
    {
        if (string.IsNullOrWhiteSpace(tokenFile))
            throw new CatalogImportException("Configure one readable catalog API token source.");
        Directory.CreateDirectory(Path.GetDirectoryName(ConfigPath)!);
        var temporary = ConfigPath + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            File.WriteAllText(temporary, JsonSerializer.Serialize(new
            {
                apiBaseUrl,
                organizationId,
                company,
                tokenFile,
                dataDir = previous?.DataDir
            }));
            var config = CatalogImportConfig.Load(temporary);
            if (previous is not null &&
                (config.ApiBaseUrl != previous.ApiBaseUrl || config.OrganizationId != previous.OrganizationId ||
                 config.Company != previous.Company))
            {
                using var client = new CatalogImportClient(previous);
                if (client.HasPendingApply())
                    throw new CatalogImportException("Recupera primero la importación pendiente de la configuración actual.");
            }

            File.Move(temporary, ConfigPath, overwrite: true);
            return config;
        }
        finally
        {
            File.Delete(temporary);
        }
    }

    private async Task ShowLocalState(CatalogImportConfig config, string message)
    {
        using var client = new CatalogImportClient(config);
        var state = await Task.Run(() => (Last: client.LastSuccess(), Pending: client.HasPendingApply()));
        SetLastSuccess(state.Last);
        ShowCounts(state.Last);
        _status.Text = state.Pending
            ? "Hay una importación pendiente. Selecciona el mismo archivo de catálogos y pulsa Sincronizar."
            : message;
    }

    private async Task Synchronize()
    {
        var config = await SaveConfig();
        using var client = new CatalogImportClient(config);
        var state = await Task.Run(() => (Last: client.LastSuccess(), Pending: client.HasPendingApply()));
        SetLastSuccess(state.Last);
        ShowCounts(state.Last);
        var sourceFile = _sourceFile.Text;
        if (string.IsNullOrEmpty(sourceFile))
        {
            _status.Text = state.Pending
                ? "Selecciona el mismo archivo de catálogos para recuperar el envío pendiente."
                : "Selecciona un archivo de catálogos en formato JSON.";
            return;
        }

        if (state.Pending)
        {
            if (!Confirm("Recuperar importación", "Se recuperará el resultado del envío anterior. ¿Continuar?"))
            {
                _status.Text = "La importación sigue pendiente.";
                return;
            }

            _status.Text = "Recuperando el resultado del envío anterior…";
            Complete(await Task.Run(() => client.RetryPendingApply(sourceFile, CancellationToken.None)));
            return;
        }

        _status.Text = "Solicitando vista previa…";
        var prepared = await Task.Run(() => client.Preview(sourceFile, CancellationToken.None));
        ShowCounts(prepared.Summary);
        _status.Text = "Vista previa de la importación.";
        if (!Confirm("Aplicar importación", PreviewMessage(prepared.Summary)))
        {
            _status.Text = "Vista previa cancelada.";
            return;
        }

        _status.Text = "Aplicando la importación…";
        Complete(await Task.Run(() => client.Apply(prepared, CancellationToken.None)));
    }

    private bool Confirm(string title, string message)
    {
        UseWaitCursor = false;
        try
        {
            return MessageBox.Show(this, message, title, MessageBoxButtons.YesNo, MessageBoxIcon.Question,
                MessageBoxDefaultButton.Button2) == DialogResult.Yes;
        }
        finally
        {
            UseWaitCursor = true;
        }
    }

    private void Complete(CatalogImportSummary summary)
    {
        SetLastSuccess(summary);
        ShowCounts(summary);
        _status.Text = "Importación completada.";
    }

    private static string TranslateError(string message) => message switch
    {
        "Invalid catalog import configuration." => "Revisa la URL (HTTPS o HTTP local, terminada en /api/v1), el UUID de organización, la empresa y la ruta del token.",
        "Catalog input is invalid JSON." => "El archivo de catálogos no contiene JSON válido.",
        "Catalog input must contain products, priceLists, prices and clients arrays." => "El archivo debe tener exactamente los arreglos products, priceLists, prices y clients.",
        "Catalog input contains invalid entries." => "El archivo contiene entradas inválidas. Revisa IDs externos, referencias, unidades y precios.",
        "Catalog input exceeds 2 MiB." or "Catalog request exceeds 2 MiB." => "El archivo de catálogos excede el límite de 2 MiB.",
        "Configure one readable catalog API token source." => "Selecciona un archivo de token legible que contenga solo el token de la API.",
        "Select the original catalog snapshot to retry this apply." => "Selecciona el mismo archivo de catálogos utilizado en el envío pendiente.",
        "Catalog API could not be reached or the response was interrupted." => "No se pudo conectar con la API o se interrumpió la respuesta. Revisa la conexión y vuelve a sincronizar.",
        "Catalog API request timed out." => "La API tardó demasiado en responder. Vuelve a sincronizar con el mismo archivo.",
        "Catalog API response was interrupted." => "Se interrumpió la respuesta de la API. Vuelve a sincronizar con el mismo archivo.",
        "Invalid catalog API response." => "La API devolvió una respuesta inesperada. Consulta el estado del servicio y vuelve a sincronizar.",
        _ when message.StartsWith("Catalog API request failed (HTTP ", StringComparison.Ordinal) =>
            "La API rechazó la solicitud (" + message["Catalog API request failed (".Length..].TrimEnd('.', ')') + "). Revisa permisos, organización, vínculo explícito con VegyFresh, nombre de lista, proveedor y unidad.",
        _ => "No se pudo completar la sincronización. Revisa configuración y archivo antes de reintentar."
    };

    private void SetLastSuccess(CatalogImportSummary? summary)
    {
        _lastSuccess.Text = summary?.AppliedAt is DateTimeOffset last
            ? $"Última importación exitosa: {last.ToLocalTime():g}"
            : "Última importación exitosa: sin registro";
    }

    private void ShowCounts(CatalogImportSummary? summary)
    {
        int[] counts = summary is null ? [] :
        [
            summary.Products.Created, summary.Products.Updated, summary.Products.Unchanged,
            summary.PriceLists.Created, summary.PriceLists.Updated, summary.PriceLists.Unchanged,
            summary.Prices.Created, summary.Prices.Updated, summary.Prices.Unchanged,
            summary.Clients.Created, summary.Clients.Updated, summary.Clients.Unchanged
        ];

        for (var i = 0; i < _counts.Length; i++)
            _counts[i].Text = summary is null ? "—" : counts[i].ToString();
    }

    private static string PreviewMessage(CatalogImportSummary summary) =>
        $"""
        Catálogo: creados / actualizados / sin cambios

        Productos: {summary.Products.Created} / {summary.Products.Updated} / {summary.Products.Unchanged}
        Listas de precios: {summary.PriceLists.Created} / {summary.PriceLists.Updated} / {summary.PriceLists.Unchanged}
        Precios: {summary.Prices.Created} / {summary.Prices.Updated} / {summary.Prices.Unchanged}
        Clientes: {summary.Clients.Created} / {summary.Clients.Updated} / {summary.Clients.Unchanged}

        ¿Aplicar esta importación en VegyFresh?
        """;
}
