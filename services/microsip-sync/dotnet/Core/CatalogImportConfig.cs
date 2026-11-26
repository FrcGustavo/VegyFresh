using System.Text.Json;

namespace Microsip.Sync;

public sealed class CatalogImportConfig
{
    CatalogImportConfig(string apiBaseUrl, string organizationId, string company, string dataDir, string? tokenFile)
    {
        ApiBaseUrl = apiBaseUrl;
        OrganizationId = organizationId;
        Company = company;
        DataDir = dataDir;
        TokenFile = tokenFile;
    }

    public string ApiBaseUrl { get; }
    public string OrganizationId { get; }
    public string Company { get; }
    public string DataDir { get; }
    public string? TokenFile { get; }

    public static CatalogImportConfig Load(string path)
    {
        Settings settings;
        try { settings = Json.Decode<Settings>(File.ReadAllText(path)); }
        catch (JsonException) { throw new CatalogImportException("Invalid catalog import configuration."); }

        if (!Uri.TryCreate(settings.ApiBaseUrl, UriKind.Absolute, out var url) ||
            !(url.Scheme == Uri.UriSchemeHttps || (url.Scheme == Uri.UriSchemeHttp && url.IsLoopback)) ||
            url.UserInfo != "" || url.Query != "" || url.Fragment != "" ||
            url.AbsolutePath.TrimEnd('/') != "/api/v1" ||
            !Guid.TryParseExact(settings.OrganizationId, "D", out var organization) ||
            !Nonempty(settings.Company) || settings.Company != settings.Company!.Trim() ||
            (settings.DataDir != null && !Nonempty(settings.DataDir)) ||
            (settings.TokenFile != null && !Nonempty(settings.TokenFile)))
            throw new CatalogImportException("Invalid catalog import configuration.");

        var directory = Path.GetDirectoryName(Path.GetFullPath(path))!;
        return new(url.GetLeftPart(UriPartial.Authority) + "/api/v1", organization.ToString("D"), settings.Company!,
            Path.GetFullPath(settings.DataDir ?? "catalog-import-data", directory),
            settings.TokenFile is null ? null : Path.GetFullPath(settings.TokenFile, directory));
    }

    static bool Nonempty(string? value) => !string.IsNullOrWhiteSpace(value) && !value.Any(char.IsControl);

    sealed record Settings(string? ApiBaseUrl, string? OrganizationId, string? Company, string? DataDir, string? TokenFile);
}
