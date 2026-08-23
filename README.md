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
curl -s http://localhost:5080/api/v2/incidents.json
curl -s http://localhost:5080/api/v2/scheduled-maintenances.json
curl -s http://localhost:5080/api/status/components
```

These stay anonymous and omit internal host:port leaves. `summary.json` includes `page`, `status` (`indicator` is `none` | `minor` | `major` | `critical`), `components`, `incidents`, and `scheduled_maintenances`. `incidents.json` lists every public incident in the snapshot (not only active) and omits incidents that only affect internal leaves — the same visibility as `summary.json`. Mixed incidents keep public component ids only. Incident objects use Statuspage fields (`started_at`, full `components`, `incident_updates.affected_components`, `deliver_notifications=false`).

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

TCP target is `{ "host": "10.0.0.5", "port": 5432 }`. DNS target is a hostname. Optional `dns.expectedAddresses` fails the probe if those IPs are missing. `tls_expiry` is an `https://` URL or host (port 443 default) and fails when the certificate is invalid or expires within `tls.days` (default 14).

Defaults: interval 60s (min 15), timeout 10s (must be `<` interval), failureThreshold 3, successThreshold 2, method GET, expectedStatus `[200,201,204]`.

Custom headers, including `Authorization`, may be stored in runtime `data/checks.json`. That file is gitignored. Never commit it.

Probe rules:

- HTTP/HTTPS: fail if status is not in `expectedStatus`, fail if `bodyContains` is set and missing (**case-sensitive**), fail if `jsonPath` is set and the value does not equal `expectedJsonValue` (simple `$.a.b` / `$.items[0].x` only), fail on timeout/connect/TLS.
- TCP: connect to host:port, then close. No payload.
- TLS expiry: certificate must be currently valid and not expiring within N days.
- DNS: hostname must resolve to at least one address; if `expectedAddresses` is set, those IPs must be present.
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

CRUD (env API key or Entra). List includes internal probes. Disable drops a check out of rollup without deleting it.

```bash
curl -s http://localhost:5080/api/checks -H "X-Api-Key: dev-key"

curl -s -X POST http://localhost:5080/api/checks \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"docs HTTPS","componentId":"azure-status","type":"https","intervalSeconds":60,"timeoutSeconds":10,"target":{"url":"https://learn.microsoft.com"},"http":{"expectedStatus":[200]}}'

curl -s -X PATCH http://localhost:5080/api/checks/<id> \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

curl -s -X PUT http://localhost:5080/api/checks/<id> \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"docs HTTPS","componentId":"azure-status","type":"https","intervalSeconds":60,"timeoutSeconds":10,"target":{"url":"https://learn.microsoft.com"},"http":{"expectedStatus":[200]}}'

curl -s -X POST http://localhost:5080/api/checks/<id>/run \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -s http://localhost:5080/api/checks/chk-github-status/results -H "X-Api-Key: dev-key"
```

`GET /api/status/components` returns `{ componentId, status, checkCount, downCount, updatedAtUtc }` for public leaves only.

`GET /api/checks/export` is always authenticated (anonymous → **401**). `StatusOperator` (or `AllowedObjectIds` / API key) gets every check, including internals, with `Authorization` and other secret header values redacted. `StatusViewer` gets **public checks only** and **no headers at all**. `POST /api/checks/import` is StatusOperator-only: create-if-missing like `POST /api/checks`, and an existing id keeps its stored host unless the imported host is the same. Viewers cannot import, PATCH, PUT, or `/run`.

## Operator admin

`/operator` is the product admin. It is not on the public page. Writes use `StatusOperator` or `AllowedObjectIds`, else `X-Api-Key` when AzureAd is unset. `StatusViewer` can read operator lists, audit, history, and public+internal status views, but cannot mutate. Header values are never rendered on operator HTML.

Check admin (APIs + UI):

- Export/import check config (`GET /api/checks/export`, `POST /api/checks/import`). Export never includes secret header values. Import is write-only.
- List every probe, including internal host:port
- Create/edit: URL or host:port; type `http` / `https` / `tcp` / `tls_expiry` / `dns`; interval/timeout; expected status; `bodyContains`; `jsonPath`; TLS days; DNS expected addresses; `componentId` + `componentName` + optional `groupId`
- Enable/disable via `PATCH /api/checks/{id}` (disabled leaves rollup immediately, not delete)
- Full edit via `PUT /api/checks/{id}`
- One-shot `POST /api/checks/{id}/run` against the stored target only (a new host is rejected)
- Delete
- Last result plus consecutive fail/success counts

The operator check UI calls these APIs (it does not post check writes through Razor page handlers).

Probe results persist to gitignored `data/check-results.json` (`checkedAtUtc`, `status`, `httpStatus`, `latencyMs`, `error` only — no response body, no headers). Public uptime bars use the last **15** days of **public** samples after restart. Internal-host samples never appear on anonymous `/` or those bars.

Page admin (operator UI and `/api/operator/*`, not public `/`):

- Component and group CRUD
- Incident open / update / resolve (operator incidents never override checked components except `under_maintenance` PATCH)
- Scheduled maintenance
- Local branding: page title plus logo file or http(s) URL, stored in gitignored `data/page.json` and `data/branding/` (png/jpg/gif/webp, not a paid CDN)
- Operator audit log on `/operator` from gitignored `data/audit.jsonl` (actor is `api-key` or Entra object ID — never an email)
- Outbound webhooks: operator add/delete URLs in gitignored `data/webhooks.json`. Loopback, link-local, RFC1918, and cloud metadata (`169.254.169.254`, `metadata.google.internal`) are rejected. On incident create/update the app POSTs the **public** incident plus **public** component status only (5s timeout, best-effort — a failed POST never fails the request). Payloads never include check targets, internal-leaf ids, probe errors, bodies, or headers. The public page does not list webhook URLs.

```bash
curl -s http://localhost:5080/api/operator/page -H "X-Api-Key: dev-key"
curl -s -X PATCH http://localhost:5080/api/operator/page \
  -H "X-Api-Key: dev-key" -H "Content-Type: application/json" \
  -d '{"name":"Local brand"}'
curl -s http://localhost:5080/api/operator/components -H "X-Api-Key: dev-key"
curl -s http://localhost:5080/api/operator/incidents -H "X-Api-Key: dev-key"
```

## Operator incidents

Operator APIs and `/operator` accept **either** an Entra user who is an operator **or** `X-Api-Key` (header or Development login cookie). An Entra sign-in alone is not enough: write access requires the `StatusOperator` app role (roles/wids claim) or an object ID listed in `AzureAd__AllowedObjectIds`. `StatusViewer` is read-only (GET lists, audit, history, export of public checks). Authenticated Entra users with neither role get **403**. `AllowedObjectIds` are operators (write), not viewers. Development default API key is `dev-key`. Override with `STATUSPAGE_API_KEY`. If AzureAd is not configured, API key still works (local-first). Unset key outside Development with no AzureAd config disables writes (401).

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
| `AzureAd__OperatorRole` | App role value for write access. Default `StatusOperator` |
| `AzureAd__ViewerRole` | App role value for read-only access. Default `StatusViewer` |
| `AzureAd__AllowedObjectIds` | Fallback only: comma-separated Entra **object IDs** (write operators, not viewers). Emails and UPNs are ignored |

If `TenantId` or `ClientId` is empty, Entra is off and `X-Api-Key` is used.

### App registration

1. In the Azure portal open **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name the app (for example `status-page-operator`). Choose **Accounts in this organizational directory only**.
3. Add a **Web** redirect URI: `https://<your-host>/signin-oidc` (local: `http://localhost:5080/signin-oidc`).
4. Open **Certificates & secrets** → **New client secret**. Copy the value into `AzureAd__ClientSecret` in the process environment. Do not put it in git.
5. Copy **Application (client) ID** and **Directory (tenant) ID** into `AzureAd__ClientId` and `AzureAd__TenantId`.
6. Open **App roles** → **Create app role**. Allowed member types: Users/Groups. Create `StatusOperator` (write) and `StatusViewer` (read-only). Enable both.
7. Open **Enterprise applications** → this app → **Users and groups** → **Add user/group** and assign `StatusOperator` or `StatusViewer`. The ID token `roles` (and `wids` when present) must carry that value.
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

Covers page-status rollup, `summary.json` / `incidents.json` / `scheduled-maintenances.json` shape, HTTP expected status + keyword + jsonPath, TCP pass/fail, TLS expiry fail, DNS evaluate (including expected addresses), hysteresis, component rollup for 0/1/N checks, check/page admin APIs, operator audit writes, persisted 15-day public check history (internals hidden), public page not exposing admin or webhook URLs, webhook URL rejects (loopback / RFC1918 / metadata) and public-only payloads, authenticated check export (401 anonymous; viewer omits internals and headers; operator redacts secrets) plus operator-only import, connector imports with mocked HTTP, Entra `StatusViewer` read-only vs `StatusOperator` write, Entra-disabled API-key fallback, and `/operator` not being public. Unit tests do not hit the three public health hosts.

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
