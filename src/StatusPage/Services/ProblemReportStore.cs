using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using StatusPage.Domain;

namespace StatusPage.Services;

public interface IProblemReportStore
{
    ProblemReport Create(string? title, string? body, IEnumerable<string>? componentIds = null, string? rateLimitKey = null);
    IReadOnlyList<ProblemReport> List();
    ProblemReport? Find(string id);
    ProblemReport MarkPromoted(string id, string incidentId);
}

public static class ProblemReportRules
{
    public const int MaxTitleLength = 200;
    public const int MaxBodyLength = 4000;
    public const int MaxReports = 200;
    public const string StatusOpen = "open";
    public const string StatusPromoted = "promoted";

    public static (string Title, string Body) Normalize(string? title, string? body)
    {
        var normalizedTitle = title?.Trim() ?? "";
        var normalizedBody = body?.Trim() ?? "";
        if (normalizedTitle.Length == 0 || normalizedBody.Length == 0)
        {
            throw new ArgumentException("Title and body are required.");
        }

        if (normalizedTitle.Length > MaxTitleLength)
        {
            throw new ArgumentException($"Title must be at most {MaxTitleLength} characters.");
        }

        if (normalizedBody.Length > MaxBodyLength)
        {
            throw new ArgumentException($"Body must be at most {MaxBodyLength} characters.");
        }

        return (normalizedTitle, normalizedBody);
    }

    /// <summary>SHA-256 hex. Never returns the raw IP or other client address.</summary>
    public static string HashRateLimitKey(string? raw)
    {
        var value = string.IsNullOrWhiteSpace(raw) ? "unknown" : raw.Trim();
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string NormalizeRateLimitKey(string? key)
    {
        var value = key?.Trim() ?? "";
        if (value.Length == 0 || LooksLikeAddress(value))
        {
            return HashRateLimitKey(value.Length == 0 ? "unknown" : value);
        }

        return IsSha256Hex(value) ? value.ToLowerInvariant() : HashRateLimitKey(value);
    }

    public static bool LooksLikeAddress(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim().Trim('[', ']');
        return IPAddress.TryParse(trimmed, out _)
               || trimmed.Contains('.', StringComparison.Ordinal) && trimmed.Any(char.IsDigit)
               || trimmed.Contains(':', StringComparison.Ordinal);
    }

    private static bool IsSha256Hex(string value) =>
        value.Length == 64 && value.All(c => Uri.IsHexDigit(c));
}

/// <summary>
/// Operator-only problem reports persisted to gitignored data/reports.json.
/// Text fields: title, body, public component ids, status. Hashed rate-limit
/// key only — never a raw IP. Not a public incident and never written onto
/// <see cref="StatusPageState"/>.
/// </summary>
public sealed class FileProblemReportStore : IProblemReportStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly object _gate = new();
    private readonly string _path;
    private List<ProblemReport> _reports;

    public FileProblemReportStore(string path)
    {
        _path = path;
        _reports = Load(path);
    }

    public ProblemReport Create(string? title, string? body, IEnumerable<string>? componentIds = null, string? rateLimitKey = null)
    {
        var (normalizedTitle, normalizedBody) = ProblemReportRules.Normalize(title, body);
        var ids = (componentIds ?? []).Select(id => id.Trim()).Where(id => id.Length > 0).Distinct(StringComparer.Ordinal).ToList();
        lock (_gate)
        {
            if (_reports.Count >= ProblemReportRules.MaxReports)
            {
                throw new ArgumentException($"At most {ProblemReportRules.MaxReports} problem reports can be stored.");
            }

            var report = new ProblemReport
            {
                Id = Guid.NewGuid().ToString("N")[..12],
                Title = normalizedTitle,
                Body = normalizedBody,
                ComponentIds = ids,
                Status = ProblemReportRules.StatusOpen,
                CreatedAt = DateTimeOffset.UtcNow,
                RateLimitKey = ProblemReportRules.NormalizeRateLimitKey(rateLimitKey)
            };
            _reports.Add(report);
            Save();
            return Clone(report);
        }
    }

    public IReadOnlyList<ProblemReport> List()
    {
        lock (_gate)
        {
            return _reports.Select(Clone).ToList();
        }
    }

    public ProblemReport? Find(string id)
    {
        lock (_gate)
        {
            var report = _reports.FirstOrDefault(r => r.Id == id);
            return report is null ? null : Clone(report);
        }
    }

    public ProblemReport MarkPromoted(string id, string incidentId)
    {
        lock (_gate)
        {
            var report = _reports.FirstOrDefault(r => r.Id == id)
                         ?? throw new KeyNotFoundException($"Unknown report '{id}'.");
            if (report.PromotedIncidentId is not null)
            {
                throw new InvalidOperationException($"Report '{id}' was already promoted.");
            }

            report.PromotedIncidentId = incidentId;
            report.PromotedAt = DateTimeOffset.UtcNow;
            report.Status = ProblemReportRules.StatusPromoted;
            Save();
            return Clone(report);
        }
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
        var file = new ReportFile
        {
            Reports = _reports.Select(ToDocument).ToList()
        };
        File.WriteAllText(_path, JsonSerializer.Serialize(file, JsonOptions));
    }

    private static List<ProblemReport> Load(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        try
        {
            var file = JsonSerializer.Deserialize<ReportFile>(File.ReadAllText(path), JsonOptions);
            return (file?.Reports ?? []).Select(FromDocument).ToList();
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static ReportDocument ToDocument(ProblemReport report) => new()
    {
        Id = report.Id,
        Title = report.Title,
        Body = report.Body,
        ComponentIds = [.. report.ComponentIds],
        Status = string.IsNullOrWhiteSpace(report.Status) ? ProblemReportRules.StatusOpen : report.Status,
        CreatedAt = report.CreatedAt,
        RateLimitKey = ProblemReportRules.NormalizeRateLimitKey(report.RateLimitKey),
        PromotedIncidentId = report.PromotedIncidentId,
        PromotedAt = report.PromotedAt
    };

    private static ProblemReport FromDocument(ReportDocument document) => new()
    {
        Id = document.Id,
        Title = document.Title,
        Body = document.Body,
        ComponentIds = [.. document.ComponentIds],
        Status = string.IsNullOrWhiteSpace(document.Status) ? ProblemReportRules.StatusOpen : document.Status.Trim(),
        CreatedAt = document.CreatedAt,
        RateLimitKey = ProblemReportRules.NormalizeRateLimitKey(document.RateLimitKey),
        PromotedIncidentId = document.PromotedIncidentId,
        PromotedAt = document.PromotedAt
    };

    private static ProblemReport Clone(ProblemReport report) => FromDocument(ToDocument(report));

    private sealed class ReportFile
    {
        public List<ReportDocument> Reports { get; set; } = [];
    }

    private sealed class ReportDocument
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public List<string> ComponentIds { get; set; } = [];
        public string Status { get; set; } = ProblemReportRules.StatusOpen;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public string? RateLimitKey { get; set; }
        public string? PromotedIncidentId { get; set; }
        public DateTimeOffset? PromotedAt { get; set; }
    }
}

/// <summary>In-memory store for isolated unit tests. Production uses <see cref="FileProblemReportStore"/>.</summary>
public sealed class InMemoryProblemReportStore : IProblemReportStore
{
    private readonly FileProblemReportStore _inner = new(Path.Combine(Path.GetTempPath(), $"reports-mem-{Guid.NewGuid():N}.json"));

    public ProblemReport Create(string? title, string? body, IEnumerable<string>? componentIds = null, string? rateLimitKey = null) =>
        _inner.Create(title, body, componentIds, rateLimitKey);

    public IReadOnlyList<ProblemReport> List() => _inner.List();

    public ProblemReport? Find(string id) => _inner.Find(id);

    public ProblemReport MarkPromoted(string id, string incidentId) => _inner.MarkPromoted(id, incidentId);
}
