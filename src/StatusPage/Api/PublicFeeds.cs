using System.Xml.Linq;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Api;

public static class PublicFeeds
{
    public static string Rss(StatusPageState publicState)
    {
        var incidents = PublicIncidents(publicState);
        var page = publicState.Page;
        var channelLink = page.Url.TrimEnd('/');
        var lastBuild = incidents.Count == 0
            ? page.UpdatedAt
            : incidents.Max(i => i.UpdatedAt);
        var items = incidents.Select(incident =>
        {
            var link = IncidentLink(page, incident);
            return new XElement("item",
                new XElement("title", incident.Name),
                new XElement("link", link),
                new XElement("guid", new XAttribute("isPermaLink", "true"), link),
                new XElement("pubDate", PageTimeZone.Rfc822(incident.UpdatedAt, page.TimeZone)),
                new XElement("description", ItemBody(publicState, incident)));
        });

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", "yes"),
            new XElement("rss",
                new XAttribute("version", "2.0"),
                new XElement("channel",
                    new XElement("title", $"{page.Name} — Incidents"),
                    new XElement("link", channelLink),
                    new XElement("description", "Public incidents"),
                    new XElement("lastBuildDate", PageTimeZone.Rfc822(lastBuild, page.TimeZone)),
                    items)));
        return document.ToString();
    }

    public static string Atom(StatusPageState publicState)
    {
        XNamespace ns = "http://www.w3.org/2005/Atom";
        var incidents = PublicIncidents(publicState);
        var page = publicState.Page;
        var self = $"{page.Url.TrimEnd('/')}/incidents.atom";
        var updated = incidents.Count == 0
            ? page.UpdatedAt
            : incidents.Max(i => i.UpdatedAt);
        var entries = incidents.Select(incident =>
        {
            var link = IncidentLink(page, incident);
            return new XElement(ns + "entry",
                new XElement(ns + "title", incident.Name),
                new XElement(ns + "link", new XAttribute("href", link)),
                new XElement(ns + "id", link),
                new XElement(ns + "updated", PublicApiMapper.Iso(incident.UpdatedAt)),
                new XElement(ns + "summary", ItemBody(publicState, incident)));
        });

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", "yes"),
            new XElement(ns + "feed",
                new XElement(ns + "title", $"{page.Name} — Incidents"),
                new XElement(ns + "link", new XAttribute("href", self), new XAttribute("rel", "self")),
                new XElement(ns + "link", new XAttribute("href", page.Url.TrimEnd('/'))),
                new XElement(ns + "id", self),
                new XElement(ns + "updated", PublicApiMapper.Iso(updated)),
                entries));
        return document.ToString();
    }

    public static IReadOnlyList<Incident> PublicIncidents(StatusPageState publicState) =>
        publicState.Incidents.OrderByDescending(i => i.UpdatedAt).ToList();

    private static string IncidentLink(StatusPageInfo page, Incident incident) =>
        $"{page.Url.TrimEnd('/')}/incidents/{incident.Id}";

    private static string ItemBody(StatusPageState publicState, Incident incident)
    {
        var latest = incident.Updates.OrderByDescending(u => u.DisplayAt).FirstOrDefault()?.Body;
        var names = publicState.Components
            .Where(c => incident.ComponentIds.Contains(c.Id))
            .Select(c => c.Name)
            .ToList();
        var parts = new List<string>
        {
            $"{incident.Status.ApiValue()} · {incident.Impact.ApiValue()}"
        };
        if (!string.IsNullOrWhiteSpace(latest))
        {
            parts.Add(latest.Trim());
        }

        if (names.Count > 0)
        {
            parts.Add("Affects: " + string.Join(", ", names));
        }

        return string.Join(" — ", parts);
    }
}
