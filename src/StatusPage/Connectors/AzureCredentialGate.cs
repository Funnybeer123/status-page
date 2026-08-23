using Azure.Core;
using Azure.Identity;
using Microsoft.Extensions.Configuration;

namespace StatusPage.Connectors;

/// <summary>
/// Optional ARM token via DefaultAzureCredential. Never required.
/// Constructed only when Azure:SubscriptionId is set.
/// </summary>
public static class AzureCredentialGate
{
    public static Func<CancellationToken, Task<string?>>? TokenProvider(IConfiguration configuration)
    {
        var subscription = configuration["Azure:SubscriptionId"] ?? configuration["AZURE_SUBSCRIPTION_ID"];
        if (string.IsNullOrWhiteSpace(subscription))
        {
            return null;
        }

        return async cancellationToken =>
        {
            try
            {
                var credential = new DefaultAzureCredential(new DefaultAzureCredentialOptions
                {
                    ExcludeInteractiveBrowserCredential = true,
                    ExcludeVisualStudioCredential = true,
                    ExcludeVisualStudioCodeCredential = true,
                    ExcludeAzureDeveloperCliCredential = true,
                    ExcludeAzurePowerShellCredential = true,
                    ExcludeBrokerCredential = true
                });
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(5));
                var token = await credential.GetTokenAsync(
                    new TokenRequestContext(["https://management.azure.com/.default"]),
                    timeout.Token);
                return token.Token;
            }
            catch
            {
                return null;
            }
        };
    }
}
