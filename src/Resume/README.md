# Evan Beer resume site

Standalone ASP.NET Core (.NET 10) Razor Pages app. It is not part of the status-page product.

## Run

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
dotnet test tests/Resume.Tests
dotnet run --project src/Resume
```

Open [http://localhost:5090](http://localhost:5090).

## Content rule

Only confirmed values are treated as facts: the name Evan Beer; UBT — DevOps Manager / Senior Cloud Infrastructure Engineer, last 2 years; KBR — Cloud Architect, 1½ years, 2023–2025. Everything else is marked incomplete or as needing Evan’s input.
