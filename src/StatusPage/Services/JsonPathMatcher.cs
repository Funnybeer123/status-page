using System.Text.Json;

namespace StatusPage.Services;

/// <summary>
/// Tiny JSONPath subset: $.a.b, $.items[0].name. No extra packages.
/// </summary>
public static class JsonPathMatcher
{
    public static bool TryGetValue(string json, string path, out string? value, out string error)
    {
        value = null;
        error = "";
        if (string.IsNullOrWhiteSpace(json))
        {
            error = "Response body was empty; cannot evaluate jsonPath.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(path))
        {
            error = "jsonPath is required when expectedJsonValue is set.";
            return false;
        }

        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (JsonException ex)
        {
            error = $"Response is not JSON: {ex.Message}";
            return false;
        }

        using (doc)
        {
            var current = doc.RootElement;
            foreach (var token in Tokenize(path))
            {
                if (token.Index is { } index)
                {
                    if (current.ValueKind != JsonValueKind.Array)
                    {
                        error = $"jsonPath '{path}': expected array before [{index}].";
                        return false;
                    }

                    if (index < 0 || index >= current.GetArrayLength())
                    {
                        error = $"jsonPath '{path}': index {index} is out of range.";
                        return false;
                    }

                    current = current[index];
                    continue;
                }

                if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(token.Name!, out var next))
                {
                    error = $"jsonPath '{path}' did not match '{token.Name}'.";
                    return false;
                }

                current = next;
            }

            value = current.ValueKind == JsonValueKind.String ? current.GetString() : current.GetRawText();
            return true;
        }
    }

    public static bool Matches(string json, string path, string? expected, out string? actual, out string error)
    {
        if (!TryGetValue(json, path, out actual, out error))
        {
            return false;
        }

        if (!string.Equals(Normalize(actual), Normalize(expected), StringComparison.Ordinal))
        {
            error = $"jsonPath '{path}' was '{actual}', expected '{expected}'.";
            return false;
        }

        return true;
    }

    private static string? Normalize(string? value) => value?.Trim().Trim('"');

    private static IEnumerable<PathToken> Tokenize(string path)
    {
        var text = path.Trim();
        if (text.StartsWith('$'))
        {
            text = text[1..];
        }

        if (text.StartsWith('.'))
        {
            text = text[1..];
        }

        var i = 0;
        while (i < text.Length)
        {
            if (text[i] == '.')
            {
                i++;
                continue;
            }

            if (text[i] == '[')
            {
                var close = text.IndexOf(']', i);
                if (close < 0 || !int.TryParse(text[(i + 1)..close], out var index))
                {
                    throw new ArgumentException($"Invalid jsonPath index in '{path}'.");
                }

                yield return new PathToken(null, index);
                i = close + 1;
                continue;
            }

            var end = i;
            while (end < text.Length && text[end] is not '.' and not '[')
            {
                end++;
            }

            yield return new PathToken(text[i..end], null);
            i = end;
        }
    }

    private readonly record struct PathToken(string? Name, int? Index);
}
