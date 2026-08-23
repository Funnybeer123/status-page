namespace StatusPage.Services;

public interface IReportRateLimiter
{
    bool TryAcquire(string key);
}

/// <summary>In-memory per-key sliding window. Used to rate-limit anonymous reports by IP.</summary>
public sealed class InMemoryReportRateLimiter : IReportRateLimiter
{
    public const int DefaultMax = 5;
    public const int DefaultWindowSeconds = 900;

    private readonly object _gate = new();
    private readonly Dictionary<string, Queue<DateTimeOffset>> _hits = new(StringComparer.Ordinal);
    private readonly int _max;
    private readonly TimeSpan _window;

    public InMemoryReportRateLimiter(int max, TimeSpan window)
    {
        _max = max < 1 ? DefaultMax : max;
        _window = window <= TimeSpan.Zero ? TimeSpan.FromSeconds(DefaultWindowSeconds) : window;
    }

    public bool TryAcquire(string key)
    {
        var id = string.IsNullOrWhiteSpace(key) ? "unknown" : key.Trim();
        var now = DateTimeOffset.UtcNow;
        lock (_gate)
        {
            if (!_hits.TryGetValue(id, out var queue))
            {
                queue = new Queue<DateTimeOffset>();
                _hits[id] = queue;
            }

            while (queue.Count > 0 && now - queue.Peek() > _window)
            {
                queue.Dequeue();
            }

            if (queue.Count >= _max)
            {
                return false;
            }

            queue.Enqueue(now);
            return true;
        }
    }
}
