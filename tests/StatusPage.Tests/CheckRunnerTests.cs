using System.Net;
using System.Net.Sockets;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using StatusPage.Domain;
using StatusPage.Services;

namespace StatusPage.Tests;

public class CheckRunnerTests
{
    [Fact]
    public void Http_expected_status_and_case_sensitive_keyword()
    {
        var at = DateTimeOffset.UtcNow;
        var ok = CheckRunner.EvaluateHttp(200, "hello OK world", [200, 201], "OK", 12, at);
        Assert.Equal(CheckResultStatus.Ok, ok.Status);
        Assert.Equal(200, ok.HttpStatus);

        var statusFail = CheckRunner.EvaluateHttp(500, "OK", [200], "OK", 8, at);
        Assert.Equal(CheckResultStatus.Fail, statusFail.Status);

        var keywordFail = CheckRunner.EvaluateHttp(200, "hello ok world", [200], "OK", 8, at);
        Assert.Equal(CheckResultStatus.Fail, keywordFail.Status);
        Assert.Contains("OK", keywordFail.Error);
    }

    [Fact]
    public async Task Tcp_connect_pass_and_fail()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        var accept = listener.AcceptTcpClientAsync();

        var runner = CreateRunner();
        var pass = await runner.RunAsync(new StatusCheck
        {
            Type = CheckType.Tcp,
            TimeoutSeconds = 2,
            Target = new CheckTargetSpec { Host = "127.0.0.1", Port = port }
        }, CancellationToken.None);
        Assert.Equal(CheckResultStatus.Ok, pass.Status);
        (await accept).Close();
        listener.Stop();

        var fail = await runner.RunAsync(new StatusCheck
        {
            Type = CheckType.Tcp,
            TimeoutSeconds = 1,
            Target = new CheckTargetSpec { Host = "127.0.0.1", Port = 1 }
        }, CancellationToken.None);
        Assert.Equal(CheckResultStatus.Fail, fail.Status);
        Assert.False(string.IsNullOrWhiteSpace(fail.Error));
    }

    private static CheckRunner CreateRunner()
    {
        var services = new ServiceCollection();
        services.AddHttpClient("StatusChecks");
        var factory = services.BuildServiceProvider().GetRequiredService<IHttpClientFactory>();
        return new CheckRunner(factory, NullLogger<CheckRunner>.Instance);
    }
}
