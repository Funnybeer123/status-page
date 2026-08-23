using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using StatusPage.Contracts;
using StatusPage.Domain;

namespace StatusPage.Services;

public sealed class CheckRunner
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<CheckRunner> _logger;
    private readonly IIcmpSender _icmpSender;

    public CheckRunner(IHttpClientFactory httpClientFactory, ILogger<CheckRunner> logger)
        : this(httpClientFactory, logger, new SystemIcmpSender())
    {
    }

    public CheckRunner(IHttpClientFactory httpClientFactory, ILogger<CheckRunner> logger, IIcmpSender icmpSender)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _icmpSender = icmpSender;
    }

    public async Task<CheckResult> RunAsync(StatusCheck check, CancellationToken cancellationToken)
    {
        var at = DateTimeOffset.UtcNow;
        if (!TryResolve(check, out var target, out var error))
        {
            return Fail(at, 0, error);
        }

        try
        {
            return check.Type switch
            {
                CheckType.Tcp => await RunTcpAsync(target, check.TimeoutSeconds, cancellationToken),
                CheckType.Dns => await RunDnsAsync(target, check, cancellationToken),
                CheckType.TlsExpiry => await RunTlsExpiryAsync(target, check, cancellationToken),
                CheckType.Icmp => await RunIcmpAsync(target, check, cancellationToken),
                _ => await RunHttpAsync(target, check, cancellationToken)
            };
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Fail(DateTimeOffset.UtcNow, check.TimeoutSeconds * 1000, $"Timed out after {check.TimeoutSeconds}s");
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Check {CheckId} failed", check.Id);
            return Fail(DateTimeOffset.UtcNow, 0, Trim(ex.Message));
        }
    }

    public static CheckResult EvaluateHttp(
        int statusCode,
        string body,
        IReadOnlyList<int> expectedStatus,
        string? bodyContains,
        int latencyMs,
        DateTimeOffset checkedAtUtc,
        string? jsonPath = null,
        string? expectedJsonValue = null)
    {
        var expected = expectedStatus.Count == 0 ? CheckContract.DefaultExpectedStatus : expectedStatus;
        if (!expected.Contains(statusCode))
        {
            return Fail(checkedAtUtc, latencyMs, $"HTTP {statusCode}, expected {string.Join(",", expected)}", statusCode);
        }

        if (!string.IsNullOrEmpty(bodyContains) && !body.Contains(bodyContains, StringComparison.Ordinal))
        {
            return Fail(checkedAtUtc, latencyMs, $"Response did not contain '{bodyContains}'", statusCode);
        }

        if (!string.IsNullOrWhiteSpace(jsonPath))
        {
            if (!JsonPathMatcher.Matches(body, jsonPath, expectedJsonValue, out _, out var jsonError))
            {
                return Fail(checkedAtUtc, latencyMs, jsonError, statusCode);
            }
        }

        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            HttpStatus = statusCode,
            LatencyMs = latencyMs,
            CheckedAtUtc = checkedAtUtc
        };
    }

    public static CheckResult EvaluateDns(
        IReadOnlyList<IPAddress> addresses,
        DateTimeOffset checkedAtUtc,
        IReadOnlyList<string>? expectedAddresses = null)
    {
        if (addresses.Count == 0)
        {
            return Fail(checkedAtUtc, 0, "DNS lookup returned no addresses.");
        }

        var expected = (expectedAddresses ?? [])
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .ToList();
        if (expected.Count > 0)
        {
            var missing = expected.Where(value =>
                !IPAddress.TryParse(value, out var want)
                || addresses.All(have => !have.Equals(want))).ToList();
            if (missing.Count > 0)
            {
                return Fail(checkedAtUtc, 0, $"DNS did not include expected address(es) {string.Join(", ", missing)}.");
            }
        }

        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            LatencyMs = 0,
            CheckedAtUtc = checkedAtUtc
        };
    }

    public static bool TryResolve(StatusCheck check, out ResolvedCheckTarget target, out string error)
    {
        target = default!;
        error = "";

        if (check.Type is CheckType.Http or CheckType.Https)
        {
            var url = check.Target.Url;
            if (string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(check.Target.Host) && check.Target.Port is > 0)
            {
                var scheme = check.Type == CheckType.Https ? "https" : "http";
                var path = check.Target.Path is { Length: > 0 } p ? (p.StartsWith('/') ? p : "/" + p) : "/";
                url = $"{scheme}://{check.Target.Host}:{check.Target.Port}{path}";
            }

            return CheckTarget.TryParse(url, check.Type.ApiValue(), out target, out error);
        }

        if (check.Type == CheckType.Dns)
        {
            var host = check.Target.Host;
            if (string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(check.Target.Url))
            {
                host = check.Target.Url;
            }

            return CheckTarget.TryParse(host, "dns", out target, out error);
        }

        if (check.Type == CheckType.TlsExpiry)
        {
            var raw = check.Target.Url;
            if (string.IsNullOrWhiteSpace(raw) && !string.IsNullOrWhiteSpace(check.Target.Host))
            {
                raw = check.Target.Port is > 0 ? $"{check.Target.Host}:{check.Target.Port}" : check.Target.Host;
            }

            return CheckTarget.TryParse(raw, "tls_expiry", out target, out error);
        }

        if (check.Type == CheckType.Icmp)
        {
            var host = check.Target.Host;
            if (string.IsNullOrWhiteSpace(host) && !string.IsNullOrWhiteSpace(check.Target.Url))
            {
                host = check.Target.Url;
            }

            return CheckTarget.TryParse(host, CheckContract.TypeIcmp, out target, out error);
        }

        if (!string.IsNullOrWhiteSpace(check.Target.Host) && check.Target.Port is > 0 and <= 65535)
        {
            return CheckTarget.TryParse($"{check.Target.Host}:{check.Target.Port}", "tcp", out target, out error);
        }

        return CheckTarget.TryParse(check.DisplayTarget, "tcp", out target, out error);
    }

    private async Task<CheckResult> RunHttpAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("StatusChecks");
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(check.TimeoutSeconds, 1, 120)));

        var method = new HttpMethod(string.IsNullOrWhiteSpace(check.Http.Method) ? "GET" : check.Http.Method);
        using var request = new HttpRequestMessage(method, target.Uri);
        request.Headers.UserAgent.Add(new ProductInfoHeaderValue("status-page-check", "1.0"));
        ApplyHeaders(request, check.Http.Headers);

        var clock = Stopwatch.StartNew();
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseContentRead, timeout.Token);
        var body = await response.Content.ReadAsStringAsync(timeout.Token);
        clock.Stop();

        return EvaluateHttp(
            (int)response.StatusCode,
            body,
            check.Http.ExpectedStatus,
            check.Http.BodyContains,
            (int)clock.ElapsedMilliseconds,
            DateTimeOffset.UtcNow,
            check.Http.JsonPath,
            check.Http.ExpectedJsonValue);
    }

    private static void ApplyHeaders(HttpRequestMessage request, Dictionary<string, string> headers)
    {
        foreach (var (name, value) in headers)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                continue;
            }

            if (!request.Headers.TryAddWithoutValidation(name, value))
            {
                request.Content ??= new StringContent("");
                request.Content.Headers.TryAddWithoutValidation(name, value);
            }
        }
    }

    private static async Task<CheckResult> RunTcpAsync(
        ResolvedCheckTarget target,
        int timeoutSeconds,
        CancellationToken cancellationToken)
    {
        var clock = Stopwatch.StartNew();
        using var client = new TcpClient();
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(timeoutSeconds, 1, 120)));
        await client.ConnectAsync(target.Host, target.Port, timeout.Token);
        client.Close();
        clock.Stop();
        return new CheckResult
        {
            Status = CheckResultStatus.Ok,
            LatencyMs = (int)clock.ElapsedMilliseconds,
            CheckedAtUtc = DateTimeOffset.UtcNow
        };
    }

    private static async Task<CheckResult> RunDnsAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(check.TimeoutSeconds, 1, 120)));
        var clock = Stopwatch.StartNew();
        var addresses = await Dns.GetHostAddressesAsync(target.Host, timeout.Token);
        clock.Stop();
        var result = EvaluateDns(addresses, DateTimeOffset.UtcNow, check.Dns.ExpectedAddresses);
        result.LatencyMs = (int)clock.ElapsedMilliseconds;
        return result;
    }

    /// <summary>
    /// Fail closed: if the process cannot send ICMP (missing capability, not
    /// permitted, or any exception), the result is fail — never ok/Up.
    /// </summary>
    public static CheckResult EvaluateIcmp(
        bool canSend,
        IPStatus? status,
        string? error,
        int latencyMs,
        DateTimeOffset checkedAtUtc)
    {
        if (!canSend)
        {
            return Fail(
                checkedAtUtc,
                latencyMs,
                string.IsNullOrWhiteSpace(error)
                    ? "ICMP ping is not available or not permitted."
                    : error);
        }

        if (status is null)
        {
            return Fail(checkedAtUtc, latencyMs, "ICMP ping returned no status.");
        }

        if (status == IPStatus.Success)
        {
            return new CheckResult
            {
                Status = CheckResultStatus.Ok,
                LatencyMs = latencyMs,
                CheckedAtUtc = checkedAtUtc
            };
        }

        return Fail(checkedAtUtc, latencyMs, $"ICMP {status}.");
    }

    private async Task<CheckResult> RunIcmpAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        var timeoutMs = Math.Clamp(check.TimeoutSeconds, 1, 120) * 1000;
        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromMilliseconds(timeoutMs));
            var clock = Stopwatch.StartNew();
            var sent = await _icmpSender.SendAsync(target.Host, timeoutMs, timeout.Token);
            clock.Stop();
            return EvaluateIcmp(true, sent.Status, null, (int)sent.RoundtripMilliseconds, DateTimeOffset.UtcNow);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return EvaluateIcmp(true, IPStatus.TimedOut, null, timeoutMs, DateTimeOffset.UtcNow);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ICMP check {CheckId} cannot ping", check.Id);
            return EvaluateIcmp(false, null, Trim(ex.Message), 0, DateTimeOffset.UtcNow);
        }
    }

    private static async Task<CheckResult> RunTlsExpiryAsync(
        ResolvedCheckTarget target,
        StatusCheck check,
        CancellationToken cancellationToken)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(check.TimeoutSeconds, 1, 120)));
        var clock = Stopwatch.StartNew();
        X509Certificate2? cert = null;
        using var client = new TcpClient();
        await client.ConnectAsync(target.Host, target.Port == 0 ? 443 : target.Port, timeout.Token);
        await using var ssl = new SslStream(client.GetStream(), false, (_, certificate, _, _) =>
        {
            if (certificate is not null)
            {
                cert = new X509Certificate2(certificate);
            }

            return true;
        });
        var options = new SslClientAuthenticationOptions
        {
            TargetHost = target.Host,
            CertificateRevocationCheckMode = X509RevocationMode.NoCheck
        };
        await ssl.AuthenticateAsClientAsync(options, timeout.Token);
        clock.Stop();

        if (cert is null)
        {
            return Fail(DateTimeOffset.UtcNow, (int)clock.ElapsedMilliseconds, "TLS handshake returned no certificate.");
        }

        using (cert)
        {
            var evaluated = TlsExpiryEvaluator.Evaluate(
                new DateTimeOffset(cert.NotBefore.ToUniversalTime(), TimeSpan.Zero),
                new DateTimeOffset(cert.NotAfter.ToUniversalTime(), TimeSpan.Zero),
                TlsExpiryEvaluator.NormalizeDays(check.Tls.Days),
                DateTimeOffset.UtcNow);
            evaluated.LatencyMs = (int)clock.ElapsedMilliseconds;
            return evaluated;
        }
    }

    private static CheckResult Fail(DateTimeOffset at, int latencyMs, string error, int? httpStatus = null) => new()
    {
        Status = CheckResultStatus.Fail,
        HttpStatus = httpStatus,
        LatencyMs = latencyMs,
        Error = Trim(error),
        CheckedAtUtc = at
    };

    private static string Trim(string message) =>
        message.Length <= 240 ? message : message[..240];
}
