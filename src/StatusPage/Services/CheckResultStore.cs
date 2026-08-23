using System.Text.Json;
using System.Text.Json.Serialization;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class CheckResultSample
{
    public string CheckId { get; set; } = "";
    public DateTimeOffset CheckedAtUtc { get; set; }
    public string Status { get; set; } = "fail";
    public int? HttpStatus { get; set; }
    public int LatencyMs { get; set; }
    public string? Error { get; set; }

    public CheckResultStatus ResultStatus =>
        Status.Equals("ok", StringComparison.OrdinalIgnoreCase) ? CheckResultStatus.Ok : CheckResultStatus.Fail;

    public CheckResult ToResult() => new()
    {
        Status = ResultStatus,
        HttpStatus = HttpStatus,
        LatencyMs = LatencyMs,
        Error = Error,
        CheckedAtUtc = CheckedAtUtc
    };

    public static CheckResultSample From(string checkId, CheckResult result) => new()
    {
        CheckId = checkId,
        CheckedAtUtc = result.CheckedAtUtc,
        Status = result.Status.ApiValue(),
        HttpStatus = result.HttpStatus,
        LatencyMs = result.LatencyMs,
        Error = result.Error
    };
}

public interface ICheckResultStore
{
    void Append(string checkId, CheckResult result);
    IReadOnlyList<CheckResultSample> List();
    void Hydrate(IEnumerable<StatusCheck> checks);
}

/// <summary>
/// Local probe history in gitignored data/check-results.json.
/// Fields: checkId, checkedAtUtc, status, httpStatus, latencyMs, error.
/// No response body. No headers.
/// </summary>
public sealed class CheckResultStore : ICheckResultStore
{
    public const int PublicBarDays = 15;
    public const int MaxPoints = 5000;
    public const int HydratePerCheck = 20;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    private readonly object _gate = new();
    private readonly string _path;
    private List<CheckResultSample> _samples;

    public CheckResultStore(string path)
    {
        _path = path;
        _samples = Load(path);
    }

    public void Append(string checkId, CheckResult result)
    {
        lock (_gate)
        {
            _samples.Add(CheckResultSample.From(checkId, result));
            _samples = Trim(_samples, DateTimeOffset.UtcNow);
            Save();
        }
    }

    public IReadOnlyList<CheckResultSample> List()
    {
        lock (_gate)
        {
            return _samples.ToList();
        }
    }

    public void Hydrate(IEnumerable<StatusCheck> checks)
    {
        lock (_gate)
        {
            foreach (var check in checks)
            {
                if (check.Results.Count > 0)
                {
                    continue;
                }

                check.Results = _samples
                    .Where(s => s.CheckId == check.Id)
                    .OrderByDescending(s => s.CheckedAtUtc)
                    .Take(HydratePerCheck)
                    .Select(s => s.ToResult())
                    .ToList();
            }
        }
    }

    public static List<CheckResultSample> Trim(IEnumerable<CheckResultSample> samples, DateTimeOffset now)
    {
        var floor = now.AddDays(-PublicBarDays);
        return samples
            .Where(s => s.CheckedAtUtc >= floor)
            .OrderByDescending(s => s.CheckedAtUtc)
            .Take(MaxPoints)
            .OrderBy(s => s.CheckedAtUtc)
            .ToList();
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
        var file = new CheckResultFile { Results = _samples };
        File.WriteAllText(_path, JsonSerializer.Serialize(file, JsonOptions));
    }

    private static List<CheckResultSample> Load(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        try
        {
            var file = JsonSerializer.Deserialize<CheckResultFile>(File.ReadAllText(path), JsonOptions);
            return Trim(file?.Results ?? [], DateTimeOffset.UtcNow);
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private sealed class CheckResultFile
    {
        public List<CheckResultSample> Results { get; set; } = [];
    }
}

public static class PublicUptime
{
    public static bool DayFailed(
        IEnumerable<CheckResultSample> samples,
        IEnumerable<StatusCheck> checks,
        DateOnly day)
    {
        var publicIds = checks
            .Where(c => !InternalHost.IsInternalCheck(c))
            .Select(c => c.Id)
            .ToHashSet(StringComparer.Ordinal);
        return samples.Any(sample =>
            publicIds.Contains(sample.CheckId)
            && DateOnly.FromDateTime(sample.CheckedAtUtc.UtcDateTime) == day
            && sample.ResultStatus == CheckResultStatus.Fail);
    }
}
