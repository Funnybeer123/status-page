using EvanBeer.Resume.Models;

namespace EvanBeer.Resume.Data;

/// <summary>
/// Only values confirmed by the site request, plus clearly labeled placeholders.
/// Contact, earlier employers, education, and accomplishments are omitted until a source resume is available.
/// </summary>
public static class ResumeContent
{
    public const string NeedsInputLabel = "Needs Evan’s input";

    public static ResumeDocument Create() => new()
    {
        Name = "Evan Beer",
        Headline = "DevOps Manager / Senior Cloud Infrastructure Engineer",
        SourceNote =
            "Built from two roles Evan specified for this site. The source PDF was not available in this environment, so contact details, education, skills, a professional summary, and earlier employment are left incomplete rather than invented.",
        Experience =
        [
            new ExperienceRole
            {
                Employer = "UBT",
                Title = "DevOps Manager / Senior Cloud Infrastructure Engineer",
                Dates = "Last 2 years",
                Duration = "~2 years",
                DatesNeedConfirmation = true,
                DateNote = "Exact start and end months need Evan’s input.",
                Bullets =
                [
                    Placeholder("Team scope, reporting line, and platforms owned in this role."),
                    Placeholder("Infrastructure, CI/CD, or reliability work delivered as manager and senior engineer."),
                    Placeholder("Measurable outcomes (uptime, delivery speed, cost, risk) that belong on the resume.")
                ]
            },
            new ExperienceRole
            {
                Employer = "KBR",
                Title = "Cloud Architect",
                Dates = "2023 – 2025",
                Duration = "1½ years",
                DatesNeedConfirmation = true,
                DateNote = "Year range and duration are confirmed; exact months need Evan’s input.",
                Bullets =
                [
                    Placeholder("Architecture scope: clouds, accounts, and systems this role covered."),
                    Placeholder("Design, migration, or governance work performed as Cloud Architect."),
                    Placeholder("Outcomes or programs that should appear on the resume.")
                ]
            }
        ],
        Contact = new IncompleteSection
        {
            Title = "Contact",
            Message = "Phone, email, location, and profiles were not in a source file available here. They are omitted on purpose."
        },
        Summary = new IncompleteSection
        {
            Title = "Summary",
            Message = "No sourced professional summary. A paragraph will go here after Evan provides the resume PDF or copy."
        },
        Skills = new IncompleteSection
        {
            Title = "Skills",
            Message = "No sourced skill list. Tools and platforms will be added from the resume file, not inferred from job titles."
        },
        Education = new IncompleteSection
        {
            Title = "Education",
            Message = "No sourced schools, degrees, or certifications."
        },
        EarlierHistory = new IncompleteSection
        {
            Title = "Earlier experience",
            Message = "Only the UBT and KBR roles above were provided. Older positions are not listed until a source resume is attached."
        }
    };

    private static ResumeBullet Placeholder(string text) => new()
    {
        Text = text,
        NeedsInput = true
    };
}
