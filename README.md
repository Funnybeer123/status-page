# status-page

Public status page for **Cloud Cost Agent** and **DevOps Engineer-in-a-Box**, modeled on [status.atlassian.com](https://status.atlassian.com/) (Statuspage.io UX + public API).

Local ASP.NET Core (.NET 10 LTS) Razor Pages app. Checks are stored as local JSON. Operator changes last until process exit except check config written to `data/checks.json`. Email/SMS subscribe is not implemented.

## Constraints

- Local only: `dotnet run` or `docker compose up`.
- No Azure spend, Terraform, paid hostname, secrets, or PATs in this repo.
- Probe only targets Evan configured. There is no network scanner. ICMP is later.
- Connectors are read-only imports, not probes. The SWA snapshot never receives connector tokens.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
dotnet test
dotnet run --project src/StatusPage
```

Open [http://localhost:5080](http://localhost:5080). Operator UI: [http://localhost:5080/operator](http://localhost:5080/operator) (API key `dev-key` in Development, or Entra when configured).

```bash
docker compose up --build
```

Same URL: [http://localhost:5080](http://localhost:5080).

## Public page

Anonymous. Shows public components only.

- Overall banner: All Systems Operational / Partial Outage / Major Outage / Under Maintenance
- Product components and subcomponents, plus check-mapped **public** endpoints
- Active incidents with timestamped updates
- Upcoming or in-progress scheduled maintenance
- Past incidents for the last 15 days

Internal `host:port` leaves (loopback, RFC1918, `*.internal` / `*.local`) are hidden here. Sign in at `/operator` to see them. Entra login is for operators and those private components only.

## Public API (Statuspage-compatible)

```bash
curl -s http://localhost:5080/api/v2/summary.json
curl -s http://localhost:5080/api/v2/status.json
curl -s http://localhost:5080/api/v2/components.json
curl -s http://localhost:5080/api/status/components
```

These stay anonymous and omit internal host:port leaves. `summary.json` includes `page`, `status` (`indicator` is `none` | `minor` | `major` | `critical`), `components`, `incidents`, and `scheduled_maintenances`.

Page indicator rollup follows [Statuspage's component rules](https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/). Group parents are display-only.

## Status checks (any public URL or internal host)

Typed contract is in `src/StatusPage/Contracts/CheckContract.cs` and `Data/checks.seed.json`. Create-if-missing is still `POST /api/checks` with `componentId` + `componentName` + optional `groupId`.

```json
{
  "id": "guid",
  "name": "probe label only",
  "componentId": "existing-or-new-leaf-slug",
  "componentName": "required when creating a leaf",
  "groupId": "optional-existing-group-id",
  "type": "http | https | tcp | tls_expiry | dns",
  "enabled": true,
  "intervalSeconds": 60,
  "timeoutSeconds": 10,
  "failureThreshold": 3,
  "successThreshold": 2,
  "target": { "url": "https://example.com/health" },
  "http": {
    "method": "GET",
    "expectedStatus": [200, 201, 204],
    "bodyContains": null,
    "jsonPath": "$.status.indicator",
    "expectedJsonValue": "none",
    "headers": { "Authorization": "Bearer runtime-only" }
  },
  "tls": { "days": 14 }
}
```

`name` is the probe label only and is never the public leaf title. Bind to an existing `componentId`, or send a new slug plus `componentName` to create an operational leaf (`groupId` optional; otherwise ungrouped).

TCP target is `{ "host": "10.0.0.5", "port": 5432 }`. DNS target is a hostname. `tls_expiry` is an `https://` URL or host (port 443 default) and fails when the certificate is invalid or expires within `tls.days` (default 14).

Defaults: interval 60s (min 15), timeout 10s (must be `<` interval), failureThreshold 3, successThreshold 2, method GET, expectedStatus `[200,201,204]`.

Custom headers, including `Authorization`, may be stored in runtime `data/checks.json`. That file is gitignored. Never commit it.

Probe rules:

- HTTP/HTTPS: fail if status is not in `expectedStatus`, fail if `bodyContains` is set and missing (**case-sensitive**), fail if `jsonPath` is set and the value does not equal `expectedJsonValue` (simple `$.a.b` / `$.items[0].x` only), fail on timeout/connect/TLS.
- TCP: connect to host:port, then close. No payload.
- TLS expiry: certificate must be currently valid and not expiring within N days.
- DNS: hostname must resolve to at least one address.
- Result: `ok|fail`, `httpStatus?`, `latencyMs`, `error?`, `checkedAtUtc`.
- Check state hysteresis: 3 consecutive fails → `Down`; 2 consecutive oks → `Up`; otherwise keep last state. Initial state is `Up`.
- Component from enabled checks: all Up → `operational`; mix → `partial_outage`; all Down → `major_outage`; zero checks → leave operator status.
- Probes never emit `degraded_performance`. That and `under_maintenance` are operator-only.
- When a check-driven component leaves operational, an auto incident (Investigating) is opened. It is resolved when all checks recover. Operator-written incidents are never auto-resolved. Connector imports are not check-driven.

Default seed probes real public health endpoints (expected HTTP 200, no body matcher):

- `https://azure.status.microsoft/status/feed/` → `azure-status` (Microsoft Azure)
- `https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1` → `azure-devops-status` (Azure DevOps)
- `https://www.githubstatus.com/api/v2/status.json` → `github-status` (GitHub)
- `__SELF_HEALTH__` → `local-health` (this process `/health` only; loopback, so Entra/operator-only)

Delete `src/StatusPage/data/checks.json` if a previous run cached toy checks. Tests do not hit these hosts.

CRUD (env API key or Entra):

```bash
curl -s http://localhost:5080/api/checks -H "X-Api-Key: dev-key"

curl -s -X POST http://localhost:5080/api/checks \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"docs HTTPS","componentId":"azure-status","type":"https","intervalSeconds":60,"timeoutSeconds":10,"target":{"url":"https://learn.microsoft.com"},"http":{"expectedStatus":[200]}}'

curl -s http://localhost:5080/api/checks/chk-github-status/results -H "X-Api-Key: dev-key"
```

`GET /api/status/components` returns `{ componentId, status, checkCount, downCount, updatedAtUtc }` for public leaves only.

## Operator incidents

Operator APIs and `/operator` accept **either** an Entra user who is an operator **or** `X-Api-Key` (header or Development login cookie). An Entra sign-in alone is not enough: the user must have the `StatusOperator` app role (roles/wids claim) or their object ID must be listed in `AzureAd__AllowedObjectIds`. Authenticated Entra users with neither get **403**. Development default API key is `dev-key`. Override with `STATUSPAGE_API_KEY`. If AzureAd is not configured, API key still works (local-first). Unset key outside Development with no AzureAd config disables writes (401).

```bash
curl -s -X PATCH http://localhost:5080/api/operator/components/azure-status \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"status":"under_maintenance"}'

curl -s -X POST http://localhost:5080/api/operator/incidents \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"Azure regional advisory","status":"investigating","impact":"minor","body":"Watching Azure public status.","componentIds":["azure-status"]}'
```

Seeded leaf ids: `azure-status`, `azure-devops-status`, `github-status`, `local-health`. New leaves can be created via `POST /api/checks` with `componentId` + `componentName`.

## Microsoft Entra ID (optional)

Operator pages and operator APIs can use Microsoft Entra ID (Azure AD) OpenID Connect. The public page stays anonymous.

Set from the environment only (never commit a client secret or tenant-specific values you do not own):

| Env | Purpose |
| --- | --- |
| `AzureAd__Instance` | `https://login.microsoftonline.com/` |
| `AzureAd__TenantId` | Directory (tenant) ID from your app registration |
| `AzureAd__ClientId` | Application (client) ID |
| `AzureAd__ClientSecret` | Client secret from Certificates & secrets |
| `AzureAd__OperatorRole` | App role value to require. Default `StatusOperator` |
| `AzureAd__AllowedObjectIds` | Fallback only: comma-separated Entra **object IDs**. Emails and UPNs are ignored |

If `TenantId` or `ClientId` is empty, Entra is off and `X-Api-Key` is used.

### App registration

1. In the Azure portal open **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name the app (for example `status-page-operator`). Choose **Accounts in this organizational directory only**.
3. Add a **Web** redirect URI: `https://<your-host>/signin-oidc` (local: `http://localhost:5080/signin-oidc`).
4. Open **Certificates & secrets** → **New client secret**. Copy the value into `AzureAd__ClientSecret` in the process environment. Do not put it in git.
5. Copy **Application (client) ID** and **Directory (tenant) ID** into `AzureAd__ClientId` and `AzureAd__TenantId`.
6. Open **App roles** → **Create app role**. Allowed member types: Users/Groups. **Value** must be `StatusOperator`. Enable the role.
7. Open **Enterprise applications** → this app → **Users and groups** → **Add user/group** and assign the `StatusOperator` role. The ID token `roles` (and `wids` when present) must carry that value.
8. Optional fallback: set `AzureAd__AllowedObjectIds` to one or more object IDs from the user's Entra profile (`oid` claim). Do not put emails or UPNs here.

This repo does not invent or ship a tenant ID. It does not treat every user in the tenant as an operator.

## Connectors (read-only imports)

Connectors are **not** check types and **not** probes. They import vendor events and map them onto existing components. If the leaf already has enabled checks, the import may open an operator-style incident but does **not** override check rollup (same lock as operator incidents). `under_maintenance` PATCH still sticks.

| Connector | Public source (no auth) | Optional env |
| --- | --- | --- |
| `azure-service-health` → `azure-status` | `https://azure.status.microsoft/status/feed/` | `Azure__SubscriptionId` plus DefaultAzureCredential for ARM Resource Health. If creds fail, RSS still works. |
| `azure-devops` → `azure-devops-status` | `https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1` | `AZURE_DEVOPS_PAT` and `AzureDevOps__Organization` or `AzureDevOps__StatusUrl` |
| `github` → `github-status` | `https://www.githubstatus.com/api/v2/status.json` | `GITHUB_TOKEN` and `GitHub__Repository` (`owner/name`) for the latest Actions run |

Never put PATs or tokens in the repo. The static snapshot workflow unsets these variables before it runs.

## Tests

```bash
dotnet test
```

Covers page-status rollup, `summary.json` shape, HTTP expected status + keyword + jsonPath, TCP pass/fail, TLS expiry fail, DNS evaluate, hysteresis, component rollup for 0/1/N checks, connector imports with mocked HTTP, Entra-disabled API-key fallback, and `/operator` not being public. Unit tests do not hit the three public health hosts.

## Static snapshot (no paid compute)

`scripts/export-static.sh` curls the three locked health URLs and writes `static/` (public HTML + `/api/v2/*.json`). A non-200 is recorded as outage; the script still exits 0. The script unsets connector/Entra tokens so a Static Web Apps deploy never receives them.

```bash
bash scripts/export-static.sh
```

GitHub Actions workflow `.github/workflows/status-snapshot.yml` runs that script every 15 minutes (`workflow_dispatch` too). It deploys to an **existing** Azure Static Web App only when repository secret `AZURE_STATIC_WEB_APPS_API_TOKEN` is set. If the secret is missing, deploy is skipped with a log line and the job stays green. No token is stored in git. This workflow is not a pull_request check.

Scheduled Actions only run on the repository default branch.

## Out of scope

- Email / SMS subscribe
- ICMP
- Connector-as-probe check types
- Creating Azure resources, ACR/ACA/App Service, or custom domains
- Probing hosts that were not explicitly configured
