using StatusPage.Domain;

namespace StatusPage.Services;

public interface IProblemReportStore
{
    ProblemReport Create(string? title, string? body);
    IReadOnlyList<ProblemReport> List();
    ProblemReport? Find(string id);
    ProblemReport MarkPromoted(string id, string incidentId);
}

public static class ProblemReportRules
{
    public const int MaxTitleLength = 200;
    public const int MaxBodyLength = 4000;

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
}

/// <summary>
/// Operator-only problem reports. In-memory. Not a public incident and never
/// written onto <see cref="StatusPageState"/>.
/// </summary>
public sealed class InMemoryProblemReportStore : IProblemReportStore
{
    private readonly object _gate = new();
    private readonly List<ProblemReport> _reports = [];

    public ProblemReport Create(string? title, string? body)
    {
        var (normalizedTitle, normalizedBody) = ProblemReportRules.Normalize(title, body);
        lock (_gate)
        {
            var report = new ProblemReport
            {
                Id = Guid.NewGuid().ToString("N")[..12],
                Title = normalizedTitle,
                Body = normalizedBody,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _reports.Add(report);
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
            return Clone(report);
        }
    }

    private static ProblemReport Clone(ProblemReport report) => new()
    {
        Id = report.Id,
        Title = report.Title,
        Body = report.Body,
        CreatedAt = report.CreatedAt,
        PromotedIncidentId = report.PromotedIncidentId,
        PromotedAt = report.PromotedAt
    };
}
