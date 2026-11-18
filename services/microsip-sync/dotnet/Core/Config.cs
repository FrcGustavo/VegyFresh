using System.Text.Json;
using System.Text.RegularExpressions;

namespace Microsip.Sync;

public sealed record AdapterConfig(string Mode = "simulator", string? HostPath = null, string? NativeConfigPath = null);
public sealed record Config(string ApiBaseUrl, string OrganizationId, string Company, string Branch, string Warehouse,
    string Since, int PageSize, int PollIntervalMs, int RetryDelayMs, int MaxAttempts, string DataDir,
    Dictionary<string, string> Clients, Dictionary<string, string> Units, AdapterConfig? Adapter = null, string[]? Statuses = null)
{
    public AdapterConfig Driver => Adapter ?? new();
    public string[] EligibleStatuses => Statuses ?? ["APPROVED"];
    public string AdapterIdentity => Driver.Mode == "simulator" ? "simulator" : $"microsip:{Driver.NativeConfigPath}";
    public static Config Load(string path)
    {
        var c = Json.Decode<Config>(File.ReadAllText(path));
        static bool Nonempty(string? s) => !string.IsNullOrWhiteSpace(s) && !s.Contains('\0');
        if (!Uri.TryCreate(c.ApiBaseUrl, UriKind.Absolute, out var url) ||
            url.Scheme is not ("https" or "http") || url.UserInfo != "" || url.Query != "" || url.Fragment != "" ||
            !Guid.TryParseExact(c.OrganizationId, "D", out _) ||
            !Nonempty(c.Company) || !Nonempty(c.Branch) || !Nonempty(c.Warehouse) || !Nonempty(c.DataDir) ||
            !Regex.IsMatch(c.Since ?? "", @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$") ||
            !DateTimeOffset.TryParse(c.Since, out _) || c.PageSize is < 1 or > 1000 ||
            c.PollIntervalMs < 1 || c.RetryDelayMs < 1 || c.MaxAttempts is < 1 or > 100 ||
            c.Clients is null || c.Clients.Count == 0 || c.Clients.Any(p => !Guid.TryParseExact(p.Key, "D", out _) || !Nonempty(p.Value)) ||
            c.Units is null || c.Units.Count != 2 || !c.Units.ContainsKey("kg") || !c.Units.ContainsKey("pz") || c.Units.Values.Any(v => !Nonempty(v)) ||
            c.EligibleStatuses.Length == 0 || c.EligibleStatuses.Distinct().Count() != c.EligibleStatuses.Length ||
            c.EligibleStatuses.Any(s => s is not ("APPROVED" or "PENDING_REVIEW")))
            throw new InvalidDataException("Invalid Microsip sync config");
        var directory = Path.GetDirectoryName(Path.GetFullPath(path))!;
        string Resolve(string s) => Path.GetFullPath(s, directory);
        if (c.Driver.Mode == "simulator")
        {
            if (c.Driver.HostPath != null || c.Driver.NativeConfigPath != null) throw new InvalidDataException("Unsupported simulator fields");
        }
        else if (c.Driver.Mode == "microsip")
        {
            if (!Nonempty(c.Driver.HostPath) || !Nonempty(c.Driver.NativeConfigPath)) throw new InvalidDataException("Microsip hostPath and nativeConfigPath required");
            c = c with { Adapter = c.Driver with { HostPath = Resolve(c.Driver.HostPath!), NativeConfigPath = Resolve(c.Driver.NativeConfigPath!) } };
        }
        else throw new InvalidDataException("adapter.mode must be simulator or microsip");
        return c with { ApiBaseUrl = url.ToString().TrimEnd('/'), DataDir = Resolve(c.DataDir) };
    }
}
