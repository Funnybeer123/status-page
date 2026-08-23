using System.Text.Json;
using StatusPage.Domain;

namespace StatusPage.Services;

public static class PageConfigStore
{
    public static readonly JsonSerializerOptions JsonOptions = CheckConfigStore.JsonOptions;

    public static void Apply(StatusPageState state, string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        var file = JsonSerializer.Deserialize<PageConfigFile>(File.ReadAllText(path), JsonOptions);
        if (file is null)
        {
            return;
        }

        if (!string.IsNullOrWhiteSpace(file.Name))
        {
            state.Page.Name = file.Name.Trim();
        }

        state.Page.LogoUrl = string.IsNullOrWhiteSpace(file.LogoUrl) ? null : file.LogoUrl.Trim();
        if (PageTimeZone.TryResolve(file.TimeZone, out var timeZone))
        {
            state.Page.TimeZone = timeZone;
        }

        if (file.Components.Count == 0)
        {
            return;
        }

        state.Components = file.Components.Select(ToComponent).ToList();
    }

    public static void Save(string path, StatusPageState state)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path))!);
        var file = new PageConfigFile
        {
            Name = state.Page.Name,
            LogoUrl = state.Page.LogoUrl,
            TimeZone = state.Page.TimeZone,
            Components = state.Components.Select(ToDocument).ToList()
        };
        File.WriteAllText(path, JsonSerializer.Serialize(file, JsonOptions));
    }

    private static Component ToComponent(ComponentDocument document)
    {
        var manual = ComponentStatus.Operational;
        if (!string.IsNullOrWhiteSpace(document.ManualStatus))
        {
            DomainEnums.TryParseComponentStatus(document.ManualStatus, out manual);
        }

        return new Component
        {
            Id = document.Id,
            Name = document.Name,
            Description = document.Description,
            Group = document.Group,
            GroupId = document.GroupId,
            ParentId = string.IsNullOrWhiteSpace(document.ParentId) ? null : document.ParentId.Trim(),
            Position = document.Position,
            Showcase = true,
            ManualStatus = manual,
            Status = manual,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    private static ComponentDocument ToDocument(Component component) => new()
    {
        Id = component.Id,
        Name = component.Name,
        Description = component.Description,
        Group = component.Group,
        GroupId = component.GroupId,
        ParentId = component.ParentId,
        Position = component.Position,
        ManualStatus = component.ManualStatus.ApiValue()
    };

    private sealed class PageConfigFile
    {
        public string Name { get; set; } = "Status";
        public string? LogoUrl { get; set; }
        public string? TimeZone { get; set; }
        public List<ComponentDocument> Components { get; set; } = [];
    }

    private sealed class ComponentDocument
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public bool Group { get; set; }
        public string? GroupId { get; set; }
        public string? ParentId { get; set; }
        public int Position { get; set; }
        public string? ManualStatus { get; set; }
    }
}
