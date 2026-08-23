FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY StatusPage.sln ./
COPY src/StatusPage/StatusPage.csproj src/StatusPage/
COPY tests/StatusPage.Tests/StatusPage.Tests.csproj tests/StatusPage.Tests/
COPY global.json ./
RUN dotnet restore
COPY . .
RUN dotnet publish src/StatusPage/StatusPage.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:5080
ENV ASPNETCORE_ENVIRONMENT=Development
ENV StatusPage__PublicUrl=http://localhost:5080
ENV StatusPage__SelfHealthUrl=http://127.0.0.1:5080/health
EXPOSE 5080
ENTRYPOINT ["dotnet", "StatusPage.dll"]
