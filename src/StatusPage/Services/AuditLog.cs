using System.Text.Json;
using System.Text.Json.Serialization;

namespace StatusPage.Services;

public sealed record AuditEntry(DateTimeOffset At, string Actor, string Action, string TargetId);

public interface IAuditLog
{
    void Append(string actor, string action, string targetId);
    IReadOnlyList<AuditEntry> Recent(int count = 50);
}

/// <summary>Append-only local JSONL. Gitignored. Actor is api-key or Entra oid only.</summary>
public sealed class FileAuditLog : IAuditLog
{
    public const int RecentDefault = 50;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly object _gate = new();
    private readonly string _path;
    private readonly List<AuditEntry> _recent = [];

    public FileAuditLog(string path)
    {
        _path = path;
        Load();
    }

    public void Append(string actor, string action, string targetId)
    {
        var entry = new AuditEntry(DateTimeOffset.UtcNow, actor, action, targetId);
        var line = JsonSerializer.Serialize(entry, JsonOptions);
        lock (_gate)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
            File.AppendAllText(_path, line + Environment.NewLine);
            _recent.Add(entry);
            if (_recent.Count > 200)
            {
                _recent.RemoveRange(0, _recent.Count - 200);
            }
        }
    }

    public IReadOnlyList<AuditEntry> Recent(int count = RecentDefault)
    {
        lock (_gate)
        {
            var take = count < 1 ? RecentDefault : count;
            return _recent.TakeLast(take).Reverse().ToList();
        }
    }

    private void Load()
    {
        if (!File.Exists(_path))
        {
            return;
        }

        foreach (var line in File.ReadLines(_path))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            try
            {
                var entry = JsonSerializer.Deserialize<AuditEntry>(line, JsonOptions);
                if (entry is not null)
                {
                    _recent.Add(entry);
                }
            }
            catch (JsonException)
            {
                // skip a corrupt line; the file stays append-only
            }
        }

        if (_recent.Count > 200)
        {
            _recent.RemoveRange(0, _recent.Count - 200);
        }
    }
}
