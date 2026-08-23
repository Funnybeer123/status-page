using System.Text.Json;
using System.Text.Json.Serialization;

namespace StatusPage.Services;

public sealed class WebhookRecord
{
    public string Id { get; set; } = "";
    public string Url { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public interface IWebhookStore
{
    IReadOnlyList<WebhookRecord> List();
    WebhookRecord Add(string url);
    void Delete(string id);
}

public sealed class FileWebhookStore : IWebhookStore
{
    public const int MaxWebhooks = 20;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly object _gate = new();
    private readonly string _path;
    private List<WebhookRecord> _hooks;

    public FileWebhookStore(string path)
    {
        _path = path;
        _hooks = Load(path);
    }

    public IReadOnlyList<WebhookRecord> List()
    {
        lock (_gate)
        {
            return _hooks.Select(Clone).ToList();
        }
    }

    public WebhookRecord Add(string url)
    {
        var normalized = NormalizeUrl(url);
        lock (_gate)
        {
            if (_hooks.Count >= MaxWebhooks)
            {
                throw new ArgumentException($"At most {MaxWebhooks} webhook URLs can be stored.");
            }

            if (_hooks.Any(h => string.Equals(h.Url, normalized, StringComparison.OrdinalIgnoreCase)))
            {
                throw new ArgumentException("That webhook URL is already registered.");
            }

            var record = new WebhookRecord
            {
                Id = Guid.NewGuid().ToString("N")[..12],
                Url = normalized,
                CreatedAt = DateTimeOffset.UtcNow
            };
            _hooks.Add(record);
            Save();
            return Clone(record);
        }
    }

    public void Delete(string id)
    {
        lock (_gate)
        {
            var existing = _hooks.FirstOrDefault(h => h.Id == id)
                           ?? throw new KeyNotFoundException($"Unknown webhook '{id}'.");
            _hooks.Remove(existing);
            Save();
        }
    }

    public static string NormalizeUrl(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)
            || !Uri.TryCreate(raw.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || string.IsNullOrWhiteSpace(uri.Host)
            || !string.IsNullOrEmpty(uri.UserInfo))
        {
            throw new ArgumentException("Webhook must be an http(s) URL with a host and no userinfo.");
        }

        if (IsBlockedWebhookHost(uri.IdnHost))
        {
            throw new ArgumentException("Webhook URL cannot be loopback, link-local, RFC1918, or cloud metadata.");
        }

        return uri.ToString();
    }

    public static bool IsBlockedWebhookHost(string host)
    {
        var value = host.Trim().Trim('[', ']');
        if (value.Equals("169.254.169.254", StringComparison.OrdinalIgnoreCase)
            || value.Equals("metadata.google.internal", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return InternalHost.IsInternalHost(value);
    }

    private void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(_path))!);
        File.WriteAllText(_path, JsonSerializer.Serialize(new WebhookFile { Webhooks = _hooks }, JsonOptions));
    }

    private static List<WebhookRecord> Load(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        try
        {
            var file = JsonSerializer.Deserialize<WebhookFile>(File.ReadAllText(path), JsonOptions);
            return file?.Webhooks.Select(Clone).ToList() ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static WebhookRecord Clone(WebhookRecord record) => new()
    {
        Id = record.Id,
        Url = record.Url,
        CreatedAt = record.CreatedAt
    };

    private sealed class WebhookFile
    {
        public List<WebhookRecord> Webhooks { get; set; } = [];
    }
}
