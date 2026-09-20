using EvanBeer.Resume.Models;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace EvanBeer.Resume.Pages;

public sealed class IndexModel : PageModel
{
    public IndexModel(ResumeDocument resume)
    {
        Resume = resume;
    }

    public ResumeDocument Resume { get; }

    public void OnGet()
    {
        ViewData["Resume"] = Resume;
        ViewData["Title"] = $"{Resume.Name} — Resume";
    }
}
