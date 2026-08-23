using System.Text.Json;
using System.Text.Json.Serialization;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class IncidentTemplate
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Impact { get; set; } = "minor";
    public List<string> ComponentIds { get; set; } = [];
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public interface IIncidentTemplateStore
{
    IReadOnlyList<IncidentTemplate> List();
    IncidentTemplate? Find(string id);
    IncidentTemplate Create(string title, string impact, IReadOnlyList<string> componentIds);
    IncidentTemplate Update(string id, string title, string impact, IReadOnlyList<string> componentIds);
    void Delete(string id);
}

public static class IncidentTemplateRules
{
    public const int MaxTitleLength = 200;
    public const int MaxComponentIds = 20;

    public static string NormalizeTitle(string? title)
    {
        var value = title?.Trim() ?? "";
        if (value.Length == 0)
        {
            throw new ArgumentException("Template title is required.");
        }

        if (value.Length > MaxTitleLength)
        {
            throw new ArgumentException($"Template title must be at most {MaxTitleLength} characters.");
        }

        return value;
    }

    public static string NormalizeImpact(string? impact)
    {
        if (!DomainEnums.TryParseIncidentImpact(string.IsNullOrWhiteSpace(impact) ? "minor" : impact, out var parsed))
        {
            throw new ArgumentException("Impact must be none, minor, major, critical, or maintenance.");
        }

        return parsed.ApiValue();
    }

    public static IReadOnlyList<string> NormalizePublicComponentIds(IEnumerable<string>? ids, IStatusStore store)
    {
        var checks = store.ListChecks();
        var result = new List<string>();
        foreach (var raw in ids ?? [])
        {
            var id = raw.Trim();
            if (id.Length == 0)
            {
                continue;
            }

            var component = store.FindComponent(id)
                            ?? throw new ArgumentException($"Unknown component '{id}'.");
            if (component.Group)
            {
                throw new ArgumentException($"Template cannot include group id '{id}'.");
            }

            if (ComponentVisibility.IsInternalLeaf(component, checks))
            {
                throw new ArgumentException($"Template cannot include internal component '{id}'.");
            }

            if (!result.Contains(id, StringComparer.Ordinal))
            {
                result.Add(id);
            }

            if (result.Count > MaxComponentIds)
            {
                throw new ArgumentException($"Template can list at most {MaxComponentIds} public component ids.");
            }
        }

        return result;
    }
}

public sealed class FileIncidentTemplateStore : IIncidentTemplateStore
{
    public const int MaxTemplates = 50;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly object _gate = new();
    private readonly string _path;
    private List<IncidentTemplate> _templates;

    public FileIncidentTemplateStore(string path, string? seedPath = null)
    {
        _path = path;
        _templates = File.Exists(path)
            ? Load(path)
            : seedPath is not null && File.Exists(seedPath)
                ? Load(seedPath)
                : [];
    }

    public IReadOnlyList<IncidentTemplate> List()
    {
        lock (_gate)
        {
            return _templates.Select(Clone).OrderBy(t => t.Title, StringComparer.OrdinalIgnoreCase).ToList();
        }
    }

    public IncidentTemplate? Find(string id)
    {
        lock (_gate)
        {
            var match = _templates.FirstOrDefault(t => t.Id == id);
            return match is null ? null : Clone(match);
        }
    }

    public IncidentTemplate Create(string title, string impact, IReadOnlyList<string> componentIds)
    {
        lock (_gate)
        {
            if (_templates.Count >= MaxTemplates)
            {
                throw new ArgumentException($"At most {MaxTemplates} incident templates can be stored.");
            }

            var record = new IncidentTemplate
            {
                Id = Guid.NewGuid().ToString("N")[..12],
                Title = title,
                Impact = impact,
                ComponentIds = [.. componentIds],
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _templates.Add(record);
            Save();
            return Clone(record);
        }
    }

    public IncidentTemplate Update(string id, string title, string impact, IReadOnlyList<string> componentIds)
    {
        lock (_gate)
        {
            var existing = _templates.FirstOrDefault(t => t.Id == id)
                           ?? throw new KeyNotFoundException($"Unknown incident template '{id}'.");
            existing.Title = title;
            existing.Impact = impact;
            existing.ComponentIds = [.. componentIds];
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            Save();
            return Clone(existing);
        }
    }

    public void Delete(string id)
    {
        lock (_gate)
        {
            var existing = _templates.FirstOrDefault(t => t.Id == id)
                           ?? throw new KeyNotFoundException($"Unknown incident template '{id}'.");
            _templates.Remove(existing);
            Save();
        }
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
        File.WriteAllText(_path, JsonSerializer.Serialize(new TemplateFile { Templates = _templates }, JsonOptions));
    }

    private static List<IncidentTemplate> Load(string path)
    {
        try
        {
            var file = JsonSerializer.Deserialize<TemplateFile>(File.ReadAllText(path), JsonOptions);
            return file?.Templates.Select(Clone).ToList() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static IncidentTemplate Clone(IncidentTemplate template) => new()
    {
        Id = template.Id,
        Title = template.Title,
        Impact = template.Impact,
        ComponentIds = [.. template.ComponentIds],
        UpdatedAt = template.UpdatedAt
    };

    private sealed class TemplateFile
    {
        public List<IncidentTemplate> Templates { get; set; } = [];
    }
}
