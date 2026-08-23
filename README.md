# status-page

Public status page for **Cloud Cost Agent** and **DevOps Engineer-in-a-Box**, modeled on [status.atlassian.com](https://status.atlassian.com/) (Statuspage.io UX + public API).

Local ASP.NET Core (.NET 10 LTS) Razor Pages app. Checks are stored as local JSON. Operator changes last until process exit except check config written to `data/checks.json`. Email/SMS subscribe is not implemented.

## Constraints

- Local only: `dotnet run` or `docker compose up`.
- No Azure, Terraform, paid hostname, secrets, or PATs in this repo.
- Probe only targets Evan configured. There is no network scanner. ICMP is later.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
dotnet test
dotnet run --project src/StatusPage
```

Open [http://localhost:5080](http://localhost:5080).

```bash
docker compose up --build
```

Same URL: [http://localhost:5080](http://localhost:5080).

## Public page

- Overall banner: All Systems Operational / Partial Outage / Major Outage / Under Maintenance
- Product components and subcomponents, plus check-mapped endpoints
- Active incidents with timestamped updates
- Upcoming or in-progress scheduled maintenance
- Past incidents for the last 15 days

Seed includes a resolved Cloud Cost Agent API incident so history is not empty.

## Public API (Statuspage-compatible)

```bash
curl -s http://localhost:5080/api/v2/summary.json
curl -s http://localhost:5080/api/v2/status.json
curl -s http://localhost:5080/api/v2/components.json
curl -s http://localhost:5080/api/status/components
```

`summary.json` includes `page`, `status` (`indicator` is `none` | `minor` | `major` | `critical`), `components`, `incidents`, and `scheduled_maintenances`.

Page indicator rollup follows [Statuspage's component rules](https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/). Group parents are display-only.

## Status checks (any public URL or internal host)

Typed contract is in `src/StatusPage/Contracts/CheckContract.cs` and `Data/checks.seed.json`.

```json
{
  "id": "guid",
  "name": "probe label only",
  "componentId": "existing-or-new-leaf-slug",
  "componentName": "required when creating a leaf",
  "groupId": "optional-existing-group-id",
  "type": "http | https | tcp",
  "enabled": true,
  "intervalSeconds": 60,
  "timeoutSeconds": 10,
  "failureThreshold": 3,
  "successThreshold": 2,
  "target": { "url": "https://example.com/health" },
  "http": { "method": "GET", "expectedStatus": [200, 201, 204], "bodyContains": null }
}
```

`name` is the probe label only and is never the public leaf title. Bind to an existing `componentId`, or send a new slug plus `componentName` to create an operational leaf (`groupId` optional; otherwise ungrouped).

TCP target is `{ "host": "10.0.0.5", "port": 5432 }`. Defaults: interval 60s (min 15), timeout 10s (must be `<` interval), failureThreshold 3, successThreshold 2, method GET, expectedStatus `[200,201,204]`.

Probe rules:

- HTTP/HTTPS: fail if status is not in `expectedStatus`, fail if `bodyContains` is set and missing (**case-sensitive**), fail on timeout/connect/TLS.
- TCP: connect to host:port, then close. No payload.
- Result: `ok|fail`, `httpStatus?`, `latencyMs`, `error?`, `checkedAtUtc`.
- Check state hysteresis: 3 consecutive fails → `Down`; 2 consecutive oks → `Up`; otherwise keep last state. Initial state is `Up`.
- Component from enabled checks: all Up → `operational`; mix → `partial_outage`; all Down → `major_outage`; zero checks → leave operator status.
- Probes never emit `degraded_performance`. That and `under_maintenance` are operator-only.
- When a check-driven component leaves operational, an auto incident (Investigating) is opened. It is resolved when all checks recover. Operator-written incidents are never auto-resolved.

Seeded examples (local demo only; tests use localhost/mocks):

- `https://example.com` → `example-com`
- `http://127.0.0.1:5080/health` → `local-health`

CRUD (env API key):

```bash
curl -s http://localhost:5080/api/checks -H "X-Api-Key: dev-key"

curl -s -X POST http://localhost:5080/api/checks \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"billing API","componentId":"cca-api","type":"https","intervalSeconds":60,"timeoutSeconds":10,"target":{"url":"https://example.com"},"http":{"expectedStatus":[200]}}'

curl -s http://localhost:5080/api/checks/chk-local-health/results -H "X-Api-Key: dev-key"
```

`GET /api/status/components` returns `{ componentId, status, checkCount, downCount, updatedAtUtc }` for the public page and `/api/v2/summary.json` mapping.

## Operator incidents

Header `X-Api-Key`. Development default `dev-key`. Override with `STATUSPAGE_API_KEY`. Unset key outside Development disables writes (401).

```bash
curl -s -X PATCH http://localhost:5080/api/operator/components/cca-dashboard \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"status":"under_maintenance"}'

curl -s -X POST http://localhost:5080/api/operator/incidents \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"API errors","status":"investigating","impact":"minor","body":"Investigating 5xx on the API.","componentIds":["cca-api"]}'
```

Seeded leaf ids: `cca-api`, `cca-dashboard`, `cca-ingestion`, `deib-api`, `deib-runner`, `deib-portal`, `example-com`, `local-health`. New leaves can be created via `POST /api/checks` with `componentId` + `componentName`.

## Tests

```bash
dotnet test
```

Covers page-status rollup, `summary.json` shape, HTTP expected status + keyword, TCP pass/fail, hysteresis, and component rollup for 0/1/N checks. CI does not hit random public hosts.

## Out of scope

- Email / SMS subscribe
- ICMP
- Paid hosting, custom domains, Terraform
- Probing hosts that were not explicitly configured
