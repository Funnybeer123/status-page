using System.Text.Json;
using System.Text.Json.Serialization;
using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

public static class CheckConfigStore
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNameCaseInsensitive = true
    };

    public static List<StatusCheck> Load(string path, DateTimeOffset now)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        var json = File.ReadAllText(path);
        var file = JsonSerializer.Deserialize<CheckConfigFile>(json, JsonOptions) ?? new CheckConfigFile();
        return file.Checks.Select(d => ToCheck(d, now)).ToList();
    }

    public static void Save(string path, IEnumerable<StatusCheck> checks)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var file = new CheckConfigFile
        {
            Checks = checks.Select(ToDocument).ToList()
        };
        File.WriteAllText(path, JsonSerializer.Serialize(file, JsonOptions));
    }

    public static CheckDocument ToDocument(StatusCheck check) => new()
    {
        Id = check.Id,
        Name = check.Name,
        ComponentId = check.ComponentId,
        ComponentName = check.ComponentName,
        GroupId = check.ComponentGroupId,
        Type = check.Type.ApiValue(),
        Enabled = check.Enabled,
        IntervalSeconds = check.IntervalSeconds,
        TimeoutSeconds = check.TimeoutSeconds,
        FailureThreshold = check.FailureThreshold,
        SuccessThreshold = check.SuccessThreshold,
        Target = new CheckTargetDocument
        {
            Url = check.Target.Url,
            Host = check.Target.Host,
            Port = check.Target.Port,
            Path = check.Target.Path
        },
        Http = check.Type is CheckType.Tcp or CheckType.Dns or CheckType.TlsExpiry
            ? null
            : new HttpCheckDocument
            {
                Method = check.Http.Method,
                ExpectedStatus = [.. check.Http.ExpectedStatus],
                BodyContains = check.Http.BodyContains,
                JsonPath = check.Http.JsonPath,
                ExpectedJsonValue = check.Http.ExpectedJsonValue,
                Headers = check.Http.Headers.Count == 0 ? null : new Dictionary<string, string>(check.Http.Headers, StringComparer.OrdinalIgnoreCase)
            },
        Tls = check.Type == CheckType.TlsExpiry
            ? new TlsCheckDocument { Days = TlsExpiryEvaluator.NormalizeDays(check.Tls.Days) }
            : null
    };

    public static StatusCheck ToCheck(CheckDocument document, DateTimeOffset now)
    {
        if (!DomainEnums.TryParseCheckType(document.Type, out var type))
        {
            type = CheckType.Https;
        }

        return new StatusCheck
        {
            Id = string.IsNullOrWhiteSpace(document.Id) ? Guid.NewGuid().ToString("N")[..12] : document.Id,
            Name = document.Name,
            ComponentId = document.ComponentId,
            ComponentName = document.ComponentName,
            ComponentGroupId = document.GroupId,
            Type = type,
            Enabled = document.Enabled,
            IntervalSeconds = document.IntervalSeconds > 0 ? document.IntervalSeconds : CheckContract.DefaultIntervalSeconds,
            TimeoutSeconds = document.TimeoutSeconds > 0 ? document.TimeoutSeconds : CheckContract.DefaultTimeoutSeconds,
            FailureThreshold = document.FailureThreshold > 0 ? document.FailureThreshold : CheckContract.DefaultFailureThreshold,
            SuccessThreshold = document.SuccessThreshold > 0 ? document.SuccessThreshold : CheckContract.DefaultSuccessThreshold,
            Target = new CheckTargetSpec
            {
                Url = document.Target.Url,
                Host = document.Target.Host,
                Port = document.Target.Port,
                Path = document.Target.Path
            },
            Http = new HttpCheckSpec
            {
                Method = string.IsNullOrWhiteSpace(document.Http?.Method) ? "GET" : document.Http!.Method,
                ExpectedStatus = document.Http?.ExpectedStatus is { Count: > 0 } statuses
                    ? [.. statuses]
                    : [.. CheckContract.DefaultExpectedStatus],
                BodyContains = document.Http?.BodyContains,
                JsonPath = document.Http?.JsonPath,
                ExpectedJsonValue = document.Http?.ExpectedJsonValue,
                Headers = document.Http?.Headers is { Count: > 0 } headers
                    ? new Dictionary<string, string>(headers, StringComparer.OrdinalIgnoreCase)
                    : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            },
            Tls = new TlsCheckSpec
            {
                Days = TlsExpiryEvaluator.NormalizeDays(document.Tls?.Days)
            },
            State = CheckState.Up,
            NextRunAt = now,
            CreatedAt = now
        };
    }

    private sealed class CheckConfigFile
    {
        public List<CheckDocument> Checks { get; set; } = [];
    }
}
