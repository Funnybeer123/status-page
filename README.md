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
- Past incidents for the last 15 days (UTC day buckets; the operator IANA zone is labels only)
- Published postmortems on the public incident page (stored markdown; HTML in the source is escaped and never executed)
- Display timestamps on `/`, `/embed`, ICS, and RSS use the operator IANA zone (`page.time_zone`, default `Etc/UTC`)
- Anonymous **Report a problem** form (`POST /` or `POST /api/reports`). Creates an operator-only report. It is not a public incident, does not change component status, and is rate-limited by IP (in-memory). The public page does not list reports.

Internal `host:port` leaves (loopback, RFC1918, `*.internal` / `*.local`) are hidden here. Sign in at `/operator` to see them. Entra login is for operators and those private components only.

## Public API (Statuspage-compatible)

```bash
curl -s http://localhost:5080/api/v2/summary.json
curl -s http://localhost:5080/api/v2/status.json
curl -s http://localhost:5080/api/v2/components.json
curl -s http://localhost:5080/api/v2/incidents.json
curl -s http://localhost:5080/api/v2/scheduled-maintenances.json
curl -s http://localhost:5080/api/status/components
curl -s http://localhost:5080/api/status/uptime
curl -s http://localhost:5080/incidents.rss
curl -s http://localhost:5080/incidents.atom
curl -s http://localhost:5080/maintenance.ics
```

These stay anonymous and omit internal host:port leaves. Unpublished postmortems never appear on anonymous `/` or v2 JSON. `summary.json` includes `page` (`time_zone` is the operator IANA zone, default `Etc/UTC`), `status` (`indicator` is `none` | `minor` | `major` | `critical`), `components`, `incidents`, and `scheduled_maintenances`. v2 ISO timestamps stay UTC. The IANA zone is labels and `page.time_zone` only. `incidents.json` lists every public incident in the snapshot (not only active) and omits incidents that only affect internal leaves — the same visibility as `summary.json`. Mixed incidents keep public component ids only. Incident objects use Statuspage fields (`started_at`, full `components`, `incident_updates.affected_components`, `deliver_notifications=false`). A published postmortem is included as `postmortem` (markdown body, no check targets / host:port / result errors). Publishing a postmortem on an internal-only incident does not make that incident public.

Page indicator rollup follows [Statuspage's component rules](https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/). Group parents are display-only.

## Public embed

Anonymous `/embed` shows overall status plus public components using the same `ForPublic` filter as `/api/v2/summary.json`. Internal leaves, check targets, and probe errors are omitted.

```html
<iframe src="http://localhost:5080/embed" width="360" height="240" style="border:0" title="Status"></iframe>
```

```html
<div id="status-embed"></div>
<script src="http://localhost:5080/js/embed.js" async></script>
```

`embed.js` reads `/api/v2/summary.json` and `/api/status/uptime`. The embed labels the updated time with `page.time_zone`. Email/SMS subscribe is not implemented.

## Public CORS

Anonymous GET on `/api/v2/*`, `/api/status/uptime`, `/api/status/components`, `/embed`, `/incidents.rss`, `/incidents.atom`, and `/maintenance.ics` send `Access-Control-Allow-Origin` so the public widget can run on other sites. Writes (POST / PUT / PATCH / DELETE) stay same-origin and never get CORS. `/api/checks*` never gets CORS, including GET export, PATCH, import, and `/run`.

`GET /api/status/components` stays `ForPublic` (no internal leaves) when CORS is applied.

Operator allow-list is gitignored `data/cors.json`. Copy `Data/cors.example.json`. An empty `allowedOrigins` list means `*`. A non-empty list rejects other origins (no ACAO; OPTIONS is 403). Override with `StatusPage__CorsAllowedOrigins__0` in the process environment. Do not commit `data/cors.json`.

## Public incident feeds

`/incidents.rss` and `/incidents.atom` list public incidents with the same visibility as `/api/v2/incidents.json`. Incidents that only touch internal leaves are omitted. Mixed incidents keep public component names only. Feeds do not include check targets or probe errors. RSS `pubDate` / `lastBuildDate` use the page IANA zone offset; Atom stays UTC ISO.

`GET /maintenance.ics` is scheduled maintenance only, using the same `ForPublic` filter. Internal-only items are omitted. Check mute windows are not public maintenance and do not appear here. ICS event instants stay UTC (`Z`); `X-WR-TIMEZONE` is the page IANA zone for display.

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
- Mute window: `mutedFrom` / `mutedUntil` UTC on the check. While now is inside the window the worker does not probe, hysteresis and auto-incidents do not move, and last component state stays. Mute is not `under_maintenance` and does not change component status by itself. `POST /api/checks/{id}/run` during an active mute returns **409** (not a probe fail). `PATCH` sets or clears the window.
- Parent leaf skip: a leaf may set `parentId` to another **leaf** (not a group). Groups still do not probe. If that parent leaf is `Down`, the worker does not probe its children, hysteresis and auto-incidents do not move, and last child state sticks (same as mute). The public page does not invent a child outage. `POST /api/checks/{id}/run` on a skipped child returns **409** (`parentDown`, not a probe fail).
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

curl -s -X PATCH http://localhost:5080/api/checks/<id> \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"mutedFrom":"2026-08-23T16:00:00Z","mutedUntil":"2026-08-23T18:00:00Z"}'

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

`GET /api/status/uptime` is anonymous and uses the same `ForPublic` snapshot. Each public leaf is `ok / (ok + fail)` from enabled public checks over the last 15 UTC days in persisted `data/check-results.json`. No samples → `uptimePercent` is omitted (never 100). Day bars may be empty. Mute windows do not invent ok samples. The payload has no internals, probe errors, or check targets. `/` and `/embed` show that percent next to the existing 15-day bars.

`GET /api/checks`, `GET /api/checks/{id}`, `GET /api/checks/{id}/results`, and `GET /api/checks/export` are always authenticated (anonymous → **401**). `StatusOperator` (or `AllowedObjectIds` / API key) sees every check, including internals, with secret header values redacted. `StatusViewer` sees **public checks only** and **no headers at all**. An internal id for a viewer is **404**. `POST /api/checks/import` is StatusOperator-only: create-if-missing like `POST /api/checks`, and an existing id keeps its stored host unless the imported host is the same. Viewers cannot import, PATCH, PUT, or `/run`.

## Operator admin

`/operator` is the product admin. It is not on the public page. Writes use `StatusOperator` or `AllowedObjectIds`, else `X-Api-Key` when AzureAd is unset. `StatusViewer` can read public check lists, audit, and history. Internal host:port probes and leaves are hidden, and there is no edit/run. Header values are never rendered on operator HTML.

Check admin (APIs + UI):

- Export/import check config (`GET /api/checks/export`, `POST /api/checks/import`). Export never includes secret header values. Import is write-only.
- List every probe, including internal host:port
- Create/edit: URL or host:port; type `http` / `https` / `tcp` / `tls_expiry` / `dns`; interval/timeout; expected status; `bodyContains`; `jsonPath`; TLS days; DNS expected addresses; `componentId` + `componentName` + optional `groupId` + optional `parentId` (parent must be a leaf)
- Enable/disable via `PATCH /api/checks/{id}` (disabled leaves rollup immediately, not delete)
- Set or clear `mutedFrom` / `mutedUntil` via the same PATCH
- Full edit via `PUT /api/checks/{id}`
- One-shot `POST /api/checks/{id}/run` against the stored target only (a new host is rejected; active mute or parent-leaf-down skip returns 409, not a fail)
- Delete
- Last result plus consecutive fail/success counts
- Next mute window on the checks section and on each check row (not a public maintenance banner)

The operator check UI calls these APIs (it does not post check writes through Razor page handlers).

Probe results persist to gitignored `data/check-results.json` (`checkedAtUtc`, `status`, `httpStatus`, `latencyMs`, `error` only — no response body, no headers). Public uptime bars and per-leaf percents use the last **15** UTC days of **enabled public** samples after restart. The operator IANA zone does not shift those UTC buckets. No sample → no percent (do not show 100). Mute windows skip the probe and do not invent ok samples. Internal-host samples never appear on anonymous `/`, `/embed`, or `/api/status/uptime`.

Page admin (operator UI and `/api/operator/*`, not public `/`):

- Component and group CRUD
- Incident open / update / resolve (operator incidents never override checked components except `under_maintenance` PATCH)
- Postmortem markdown after resolve (default unpublished; StatusViewer can read; only StatusOperator can write or publish)
- Problem reports: StatusViewer can list; StatusOperator can promote one to a public incident (public component ids only; internals rejected). Promote audit actor is `api-key` or Entra `oid`.
- Scheduled maintenance
- Local branding: page title, IANA time zone (default `Etc/UTC`; invalid/unknown → **400**), plus logo file or http(s) URL, stored in gitignored `data/page.json` and `data/branding/` (png/jpg/gif/webp, not a paid CDN). The zone is labels and v2 `page.time_zone` only — probes, mute windows, check-results.json, and 15-day uptime stay UTC.
- Operator audit log on `/operator` from gitignored `data/audit.jsonl` (actor is `api-key`, Entra object ID, or inbound `webhook` — never an email or the webhook secret)
- Outbound webhooks: operator add/delete URLs in gitignored `data/webhooks.json`. Loopback, link-local, RFC1918, and cloud metadata (`169.254.169.254`, `metadata.google.internal`) are rejected. On incident create/update the app POSTs the **public** incident plus **public** component status only (5s timeout, best-effort — a failed POST never fails the request). Payloads never include check targets, internal-leaf ids, probe errors, bodies, or headers. The public page does not list webhook URLs.
- Inbound incident webhook: optional `POST /api/hooks/incidents`. Disabled (**404**, not 401) when `StatusPage:EnableIncidentWebhook` is `false` **or** the env secret is unset. Set `STATUSPAGE_INCIDENT_WEBHOOK_SECRET` or `StatusPage:IncidentWebhookSecret` in the process environment only — never commit it. Send the same value in `X-Incident-Webhook-Secret` (constant-time compare). Wrong/missing secret while enabled → **401**. Receive-only: the handler does not fetch caller URLs (no SSRF). POST can open or update a **public** incident only; internal component ids are **400**. It never writes `CheckResult` and does not override a leaf that has enabled checks (same lock as connector imports). Audit actor is `webhook`.

```bash
curl -s http://localhost:5080/api/operator/page -H "X-Api-Key: dev-key"
curl -s -X PATCH http://localhost:5080/api/operator/page \
  -H "X-Api-Key: dev-key" -H "Content-Type: application/json" \
  -d '{"name":"Local brand","timeZone":"America/Los_Angeles"}'
curl -s http://localhost:5080/api/operator/components -H "X-Api-Key: dev-key"
curl -s http://localhost:5080/api/operator/incidents -H "X-Api-Key: dev-key"
curl -s http://localhost:5080/api/operator/incidents/<id>/postmortem -H "X-Api-Key: dev-key"
curl -s http://localhost:5080/api/operator/templates -H "X-Api-Key: dev-key"
curl -s http://localhost:5080/api/operator/reports -H "X-Api-Key: dev-key"
```

Anonymous report (not a public incident):

```bash
curl -s -X POST http://localhost:5080/api/reports \
  -H "Content-Type: application/json" \
  -d '{"title":"Billing errors","body":"Checkout returns 500."}'

curl -s -X POST http://localhost:5080/api/operator/reports/<id>/promote \
  -H "X-Api-Key: dev-key" -H "Content-Type: application/json" \
  -d '{"impact":"minor","componentIds":["azure-status"]}'
```

Incident templates (operator-only create/edit/delete) store title, impact, and default **public** component ids in gitignored `data/incident-templates.json`. A secret-free seed lives in `Data/incident-templates.seed.json`. Applying a template pre-fills incident create (`/operator?applyTemplate=<id>#incidents`). Internal component ids are rejected.

## Operator incidents

Operator APIs and `/operator` accept **either** an Entra user who is an operator **or** `X-Api-Key` (header or Development login cookie). An Entra sign-in alone is not enough: write access requires the `StatusOperator` app role (roles/wids claim) or an object ID listed in `AzureAd__AllowedObjectIds`. `StatusViewer` is read-only (GET lists, audit, history, export of public checks, unpublished postmortems, problem reports). Authenticated Entra users with neither role get **403**. `AllowedObjectIds` are operators (write), not viewers. Development default API key is `dev-key`. Override with `STATUSPAGE_API_KEY`. If AzureAd is not configured, API key still works (local-first). Unset key outside Development with no AzureAd config disables writes (401).

After resolve, `PUT /api/operator/incidents/{id}/postmortem` stores markdown (`published` defaults false). Publishing rejects (or the public snapshot strips) check targets, `host:port`, and result error strings. Unpublished notes stay off anonymous `/` and v2 JSON. Publishing does not change internal-only visibility. There are no new check APIs.

```bash
curl -s -X PATCH http://localhost:5080/api/operator/components/azure-status \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"status":"under_maintenance"}'

curl -s -X POST http://localhost:5080/api/operator/incidents \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"Azure regional advisory","status":"investigating","impact":"minor","body":"Watching Azure public status.","componentIds":["azure-status"]}'

curl -s -X PUT http://localhost:5080/api/operator/incidents/<id>/postmortem \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"body":"## What happened\\nTimeouts recovered after a vendor advisory.","published":false}'

curl -s -X POST http://localhost:5080/api/hooks/incidents \
  -H "X-Incident-Webhook-Secret: $STATUSPAGE_INCIDENT_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"name":"Vendor advisory","status":"investigating","impact":"minor","body":"Inbound webhook.","componentIds":["azure-status"]}'
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

Covers page-status rollup, `summary.json` / `incidents.json` / `scheduled-maintenances.json` shape, default `page.time_zone` `Etc/UTC`, valid IANA zone on summary plus public/embed/ICS/RSS labels, invalid zone **400**, samples still stored UTC with unshifted 15-day UTC uptime buckets, public embed and RSS/Atom omitting internals, `maintenance.ics` omitting internal-only scheduled maintenance, incident templates rejecting internal component ids, anonymous-GET CORS (`summary.json` has ACAO; `POST /api/checks` does not; bad origins rejected when the allow-list is set; `/api/status/components` stays `ForPublic`), HTTP expected status + keyword + jsonPath, TCP pass/fail, TLS expiry fail, DNS evaluate (including expected addresses), hysteresis, mute windows skipping probes and auto-incidents, parent-leaf-down skipping child probes and auto-incidents without inventing a public child outage, component rollup for 0/1/N checks, check/page admin APIs, operator audit writes, persisted 15-day public check history (internals hidden), public page not exposing admin or webhook URLs, webhook URL rejects (loopback / RFC1918 / metadata) and public-only payloads, inbound `POST /api/hooks/incidents` (unset/disabled secret → 404; bad secret → 401; internal ids → 400; checked leaf not overridden; audit actor `webhook`), authenticated check export (401 anonymous; viewer omits internals and headers; operator redacts secrets) plus operator-only import, connector imports with mocked HTTP, Entra `StatusViewer` read-only vs `StatusOperator` write, Entra-disabled API-key fallback, `/operator` not being public, unpublished postmortems hidden from anonymous `/` and v2 JSON, published postmortems visible without check internals, HTML in postmortem markdown not executed, StatusViewer reading unpublished notes, publishing on an internal-only incident leaving it anonymous-404, anonymous `POST /api/reports` creating an operator-only report hidden from `summary.json` and `/`, IP rate limit **429**, StatusOperator promote creating a public incident (internal component ids rejected; audit actor `api-key` or Entra `oid`), and StatusViewer reading reports but **403** on promote. Unit tests do not hit the three public health hosts.

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
