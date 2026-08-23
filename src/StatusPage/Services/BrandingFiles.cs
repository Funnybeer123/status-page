using Microsoft.AspNetCore.Http;

namespace StatusPage.Services;

public static class BrandingFiles
{
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp"
    };

    public static string Save(string directory, IFormFile file)
    {
        if (file.Length <= 0 || file.Length > 1_000_000)
        {
            throw new ArgumentException("Logo file must be between 1 byte and 1 MB.");
        }

        var ext = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(ext))
        {
            throw new ArgumentException("Logo must be png, jpg, gif, or webp.");
        }

        Directory.CreateDirectory(directory);
        foreach (var existing in Directory.GetFiles(directory, "logo.*"))
        {
            File.Delete(existing);
        }

        var name = "logo" + ext.ToLowerInvariant();
        var path = Path.Combine(directory, name);
        using var stream = File.Create(path);
        file.CopyTo(stream);
        return "/branding/" + name;
    }

    public static IResult Serve(string directory, string file)
    {
        var safe = Path.GetFileName(file);
        if (string.IsNullOrWhiteSpace(safe) || safe != file || safe.Contains("..", StringComparison.Ordinal))
        {
            return Results.NotFound();
        }

        var ext = Path.GetExtension(safe);
        if (!AllowedExtensions.Contains(ext))
        {
            return Results.NotFound();
        }

        var path = Path.Combine(directory, safe);
        if (!File.Exists(path))
        {
            return Results.NotFound();
        }

        var contentType = ext.ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
        return Results.File(path, contentType);
    }
}
