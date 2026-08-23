using System.Net;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;

namespace StatusPage.Services;

/// <summary>
/// Renders stored markdown for the public incident page. HTML in the source
/// is escaped first so raw tags are never executed.
/// </summary>
public static class PostmortemMarkdown
{
    private static readonly Regex InlineCode = new("`([^`]+)`", RegexOptions.Compiled);
    private static readonly Regex Bold = new(@"\*\*(.+?)\*\*", RegexOptions.Compiled);
    private static readonly Regex Italic = new(@"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", RegexOptions.Compiled);
    private static readonly Regex Link = new(@"\[([^\]]+)\]\(([^)]+)\)", RegexOptions.Compiled);

    public static string ToSafeHtml(string? markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return "";
        }

        var escaped = HtmlEncoder.Default.Encode(
            markdown.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n'));
        var html = new StringBuilder();
        foreach (var rawBlock in Regex.Split(escaped, @"\n{2,}"))
        {
            var block = rawBlock.Trim();
            if (block.Length == 0)
            {
                continue;
            }

            var lines = block.Split('\n');
            if (lines.All(IsListItem))
            {
                html.Append("<ul>");
                foreach (var line in lines)
                {
                    html.Append("<li>").Append(Inline(line.TrimStart()[2..])).Append("</li>");
                }

                html.Append("</ul>");
                continue;
            }

            if (block.StartsWith("### ", StringComparison.Ordinal))
            {
                html.Append("<h3>").Append(Inline(block[4..])).Append("</h3>");
                continue;
            }

            if (block.StartsWith("## ", StringComparison.Ordinal))
            {
                html.Append("<h2>").Append(Inline(block[3..])).Append("</h2>");
                continue;
            }

            if (block.StartsWith("# ", StringComparison.Ordinal))
            {
                html.Append("<h2>").Append(Inline(block[2..])).Append("</h2>");
                continue;
            }

            html.Append("<p>").Append(Inline(block.Replace("\n", "<br />", StringComparison.Ordinal))).Append("</p>");
        }

        return html.ToString();
    }

    private static bool IsListItem(string line)
    {
        var trimmed = line.TrimStart();
        return trimmed.StartsWith("- ", StringComparison.Ordinal)
               || trimmed.StartsWith("* ", StringComparison.Ordinal);
    }

    private static string Inline(string text)
    {
        text = InlineCode.Replace(text, match => $"<code>{match.Groups[1].Value}</code>");
        text = Bold.Replace(text, match => $"<strong>{match.Groups[1].Value}</strong>");
        text = Italic.Replace(text, match => $"<em>{match.Groups[1].Value}</em>");
        return Link.Replace(text, match =>
        {
            var label = match.Groups[1].Value;
            var href = WebUtility.HtmlDecode(match.Groups[2].Value.Trim());
            if (!Uri.TryCreate(href, UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps
                || string.IsNullOrWhiteSpace(uri.Host)
                || uri.Scheme.Equals("javascript", StringComparison.OrdinalIgnoreCase))
            {
                return label;
            }

            return $"<a href=\"{HtmlEncoder.Default.Encode(uri.ToString())}\" rel=\"nofollow noopener\">{label}</a>";
        });
    }
}
