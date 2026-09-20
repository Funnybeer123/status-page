namespace EvanBeer.Resume.Models;

public sealed record ResumeDocument
{
    public required string Name { get; init; }
    public required string Headline { get; init; }
    public required string SourceNote { get; init; }
    public required IReadOnlyList<ExperienceRole> Experience { get; init; }
    public required IncompleteSection Contact { get; init; }
    public required IncompleteSection Summary { get; init; }
    public required IncompleteSection Skills { get; init; }
    public required IncompleteSection Education { get; init; }
    public required IncompleteSection EarlierHistory { get; init; }
}

public sealed record ExperienceRole
{
    public required string Employer { get; init; }
    public required string Title { get; init; }
    public required string Dates { get; init; }
    public required string Duration { get; init; }
    public required bool DatesNeedConfirmation { get; init; }
    public required string DateNote { get; init; }
    public required IReadOnlyList<ResumeBullet> Bullets { get; init; }
}

public sealed record ResumeBullet
{
    public required string Text { get; init; }
    public required bool NeedsInput { get; init; }
}

public sealed record IncompleteSection
{
    public required string Title { get; init; }
    public required string Message { get; init; }
}
