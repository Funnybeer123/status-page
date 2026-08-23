# status-page

Public status page for **Cloud Cost Agent** and **DevOps Engineer-in-a-Box**, modeled on [status.atlassian.com](https://status.atlassian.com/) (Statuspage.io UX + public API).

This is a local ASP.NET Core (.NET 10 LTS) Razor Pages app. Persistence is **in-memory**, seeded at startup. Operator changes last until the process exits. Email/SMS subscribe is not implemented.

## Constraints

- Local only: `dotnet run` or `docker compose up`.
- No Azure, Terraform, paid hostname, secrets, or PATs in this repo.
- Do not point the check worker at hosts you did not configure. There is no network scanner.

## Run locally

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```bash
dotnet test
dotnet run --project src/StatusPage
```

Then open [http://localhost:5080](http://localhost:5080).

Docker:

```bash
docker compose up --build
```

Same URL: [http://localhost:5080](http://localhost:5080).

## Public page

The home page shows:

- Overall banner: All Systems Operational / Partial Outage / Major Outage / Under Maintenance
- Product components and subcomponents, plus any check-created endpoints
- Active incidents with timestamped updates
- Upcoming or in-progress scheduled maintenance
- Past incidents for the last 15 days

Seed data includes a resolved Cloud Cost Agent API incident so history is not empty, an upcoming ingestion maintenance window, and two example checks.

## Public API (Statuspage-compatible)

```bash
curl -s http://localhost:5080/api/v2/summary.json
curl -s http://localhost:5080/api/v2/status.json
curl -s http://localhost:5080/api/v2/components.json
```

`summary.json` includes `page`, `status` (`indicator` is `none` | `minor` | `major` | `critical`), `components`, `incidents` (unresolved), and `scheduled_maintenances` (upcoming or in progress).

Page indicator rollup follows [Statuspage's component rules](https://support.atlassian.com/statuspage/docs/top-level-status-and-incident-impact-calculations/). Group parents are display-only; only leaf components count toward the page indicator.

## Health checks (any public site or internal service)

A check is **not** limited to the two seeded products. Create one for any single URL or `host:port` you operate or are allowed to probe.

| Field | Notes |
| --- | --- |
| `name` | Display name |
| `target` | One `https://…` / `http://…` URL, or `host:port` |
| `type` | `http`, `https`, or `tcp` (inferred from the target when omitted) |
| `interval_seconds` | Default 60 (min 10) |
| `timeout_seconds` | Default 10 |
| `expected_status` | HTTP only, default 200 |
| `keyword` | Optional substring that must appear in the HTTP body |
| `component_id` | Existing leaf component. If omitted, a new component is created |
| `group_id` | Optional product group when auto-creating a component |

A background worker runs **only configured checks** and updates the mapped component:

- 1 consecutive failure → degraded performance
- 2 → partial outage
- 3+ (default failure threshold) → major outage
- Enough consecutive successes (default 1) → operational
- Components already `under_maintenance` are left alone

Seeded examples:

- `https://example.com` → component `example.com`
- `http://127.0.0.1:5080/health` → component `Local status page`

## Operator API (env-gated key)

No auth vendor. Send header `X-Api-Key`.

- Development default key: `dev-key` (`StatusPage:ApiKey` in `appsettings.Development.json`)
- Override or set in any environment with `STATUSPAGE_API_KEY`
- If the key is unset outside Development, operator routes return 401

```bash
# Create a check against any single public site
curl -s -X POST http://localhost:5080/api/operator/checks \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"example.org","target":"https://example.org","type":"https","interval_seconds":60}'

# TCP check against an internal listener you already run
curl -s -X POST http://localhost:5080/api/operator/checks \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"local ssh","target":"127.0.0.1:22","type":"tcp","group_id":"devops-eia-box"}'

# Change a component status
curl -s -X PATCH http://localhost:5080/api/operator/components/cca-api \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"status":"partial_outage"}'

# Open an incident (also moves listed components)
curl -s -X POST http://localhost:5080/api/operator/incidents \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name":"API errors","status":"investigating","impact":"minor","body":"Investigating 5xx on the API.","componentIds":["cca-api"]}'

# Add an update / resolve
curl -s -X POST http://localhost:5080/api/operator/incidents/inc-cca-api-timeouts/updates \
  -H "X-Api-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved","body":"Traffic is normal."}'
```

Component ids from seed: `cloud-cost-agent`, `cca-api`, `cca-dashboard`, `cca-ingestion`, `devops-eia-box`, `deib-api`, `deib-runner`, `deib-portal`, `example-com`, `local-health`.

## Tests

```bash
dotnet test
```

Coverage includes status rollup (component statuses → page indicator) and the `summary.json` shape.

## Out of scope

- Email / SMS subscribe
- Paid hosting, custom domains, Terraform
- Scanning or probing hosts that were not explicitly configured
