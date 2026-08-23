#!/usr/bin/env bash
# Probe the three locked public health URLs and write a static snapshot.
# A non-200 (or curl error) is recorded as outage. The script always exits 0
# after writing files so republish jobs do not fail when a vendor is down.
set -uo pipefail

# Public snapshot only. Drop connector / Entra tokens so SWA never receives them.
unset AZURE_DEVOPS_PAT || true
unset GITHUB_TOKEN || true
unset AzureAd__ClientSecret || true
unset AZURE_CLIENT_SECRET || true
unset AZURE_CLIENT_ID || true
unset AZURE_TENANT_ID || true
unset Azure__SubscriptionId || true
unset AZURE_SUBSCRIPTION_ID || true

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-"$ROOT/static"}"
CSS_SRC="$ROOT/src/StatusPage/wwwroot/css/site.css"
NOW_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
NOW_DISPLAY="$(date -u +"%Y-%m-%d %H:%M") UTC"

mkdir -p "$OUT/api/v2" "$OUT/api/status" "$OUT/css"

probe() {
  local url="$1"
  local body="$2"
  local code
  code="$(curl -sS -L --max-time 20 -o "$body" -w "%{http_code}" "$url" 2>/dev/null || true)"
  if [[ ! "$code" =~ ^[0-9]{3}$ ]]; then
    code="000"
  fi
  printf '%s' "$code"
}

AZURE_URL="https://azure.status.microsoft/status/feed/"
ADO_URL="https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1"
GITHUB_URL="https://www.githubstatus.com/api/v2/status.json"

AZURE_CODE="$(probe "$AZURE_URL" "$OUT/.azure.body")"
ADO_CODE="$(probe "$ADO_URL" "$OUT/.ado.body")"
GITHUB_CODE="$(probe "$GITHUB_URL" "$OUT/.github.body")"
rm -f "$OUT/.azure.body" "$OUT/.ado.body" "$OUT/.github.body"

python3 - "$OUT" "$CSS_SRC" "$NOW_UTC" "$NOW_DISPLAY" "$AZURE_CODE" "$ADO_CODE" "$GITHUB_CODE" <<'PY'
import json
import shutil
import sys
from pathlib import Path

out, css_src, now_utc, now_display, azure_code, ado_code, github_code = sys.argv[1:8]
out = Path(out)

def leaf(code):
    ok = code == "200"
    return {
        "ok": ok,
        "http": code,
        "status": "operational" if ok else "major_outage",
        "pill": "operational" if ok else "outage",
        "label": "Operational" if ok else "Outage",
    }

checks = [
    {
        "id": "azure-status",
        "name": "Microsoft Azure",
        "group": "Cloud Cost Agent",
        "group_id": "cloud-cost-agent",
        "description": "Official Azure status RSS feed.",
        "url": "https://azure.status.microsoft/status/feed/",
        **leaf(azure_code),
    },
    {
        "id": "azure-devops-status",
        "name": "Azure DevOps",
        "group": "DevOps Engineer-in-a-Box",
        "group_id": "devops-eia-box",
        "description": "Official Azure DevOps public health API.",
        "url": "https://status.dev.azure.com/_apis/status/health?api-version=7.1-preview.1",
        **leaf(ado_code),
    },
    {
        "id": "github-status",
        "name": "GitHub",
        "group": "DevOps Engineer-in-a-Box",
        "group_id": "devops-eia-box",
        "description": "GitHub public Statuspage v2 status API.",
        "url": "https://www.githubstatus.com/api/v2/status.json",
        **leaf(github_code),
    },
]

down = sum(1 for c in checks if not c["ok"])
total = len(checks)
if down == 0:
    indicator, description, banner, overall_class, overall_pill, overall_label, overall_glyph = (
        "none", "All Systems Operational", "All systems operational",
        "", "operational", "Operational", "✓",
    )
elif down == total:
    indicator, description, banner, overall_class, overall_pill, overall_label, overall_glyph = (
        "critical", "Major System Outage", "Major outage",
        "overall-outage", "outage", "Outage", "×",
    )
else:
    indicator, description, banner, overall_class, overall_pill, overall_label, overall_glyph = (
        "major", "Partial System Outage", "Partial outage",
        "overall-degraded", "degraded", "Degraded", "!",
    )

page = {
    "id": "local-status",
    "name": "Status",
    "url": "/",
    "time_zone": "Etc/UTC",
    "updated_at": now_utc,
}

def component(c, position):
    return {
        "id": c["id"],
        "name": c["name"],
        "status": c["status"],
        "created_at": now_utc,
        "updated_at": now_utc,
        "position": position,
        "description": c["description"],
        "showcase": True,
        "start_date": None,
        "group_id": c["group_id"],
        "page_id": "local-status",
        "group": False,
        "only_show_if_degraded": False,
    }

groups = [
    {
        "id": "cloud-cost-agent",
        "name": "Cloud Cost Agent",
        "description": "FinOps agent that reads Azure spend and recommendations.",
        "group": True,
        "group_id": None,
        "position": 1,
    },
    {
        "id": "devops-eia-box",
        "name": "DevOps Engineer-in-a-Box",
        "description": "Agent that drafts and applies changes through Azure DevOps and GitHub.",
        "group": True,
        "group_id": None,
        "position": 2,
    },
]

components = []
for i, g in enumerate(groups, start=1):
    children = [c for c in checks if c["group_id"] == g["id"]]
    worst = "major_outage" if any(c["status"] == "major_outage" for c in children) else (
        "partial_outage" if any(c["status"] != "operational" for c in children) else "operational"
    )
    if 0 < sum(1 for c in children if not c["ok"]) < len(children):
        worst = "partial_outage"
    components.append({
        "id": g["id"],
        "name": g["name"],
        "status": worst,
        "created_at": now_utc,
        "updated_at": now_utc,
        "position": g["position"],
        "description": g["description"],
        "showcase": True,
        "start_date": None,
        "group_id": None,
        "page_id": "local-status",
        "group": True,
        "only_show_if_degraded": False,
    })

for i, c in enumerate(checks, start=1):
    components.append(component(c, i))

summary = {
    "page": page,
    "status": {"indicator": indicator, "description": description},
    "components": components,
    "incidents": [],
    "scheduled_maintenances": [],
}

(out / "api/v2/summary.json").write_text(json.dumps(summary, indent=2) + "\n")
(out / "api/v2/status.json").write_text(json.dumps({"page": page, "status": summary["status"]}, indent=2) + "\n")
(out / "api/v2/components.json").write_text(json.dumps({"page": page, "components": components}, indent=2) + "\n")
(out / "api/status/components.json").write_text(json.dumps([
    {
        "componentId": c["id"],
        "status": c["status"],
        "checkCount": 1,
        "downCount": 0 if c["ok"] else 1,
        "updatedAtUtc": now_utc,
        "httpStatus": c["http"],
        "url": c["url"],
    }
    for c in checks
], indent=2) + "\n")
empty_days = [{"date": "", "ok": 0, "fail": 0} for _ in range(15)]
(out / "api/status/uptime.json").write_text(json.dumps({
    "windowDays": 15,
    "components": [
        {
            "id": c["id"],
            "name": c["name"],
            "ok": 0,
            "fail": 0,
            "uptimePercent": None,
            "days": empty_days,
        }
        for c in checks
    ],
}, indent=2) + "\n")
(out / "probes.json").write_text(json.dumps({
    "checkedAtUtc": now_utc,
    "probes": [{"id": c["id"], "url": c["url"], "httpStatus": c["http"], "status": c["status"]} for c in checks],
}, indent=2) + "\n")
(out / "staticwebapp.config.json").write_text(json.dumps({
    "trailingSlash": "auto",
    "routes": [
        {"route": "/api/status/components", "rewrite": "/api/status/components.json"},
        {"route": "/api/status/uptime", "rewrite": "/api/status/uptime.json"}
    ],
}, indent=2) + "\n")

css = Path(css_src)
if css.is_file():
    shutil.copyfile(css, out / "css/site.css")

def cards(group_name, group_id):
    kids = [c for c in checks if c["group_id"] == group_id]
    ok = sum(1 for c in kids if c["ok"])
    rows = []
    for c in kids:
        mono = c["name"][0]
        rows.append(f"""
            <article class="service-card">
                <span class="monogram" aria-hidden="true">{mono}</span>
                <div class="service-text">
                    <div class="service-name">{c["name"]}</div>
                    <div class="service-meta">{c["description"]} HTTP {c["http"]}</div>
                </div>
                <span class="pill pill-{c["pill"]}">{c["label"]}</span>
                <span class="chevron" aria-hidden="true">›</span>
            </article>""")
    return f"""
        <div class="group-block">
            <div class="group-heading">
                <span>{group_name}</span>
                <span>{ok}/{len(kids)} operational</span>
            </div>
            <div class="service-grid">{''.join(rows)}
            </div>
        </div>"""

incidents = []
for c in checks:
    if c["ok"]:
        continue
    incidents.append(f"""
        <article class="incident-row">
            <span class="pill pill-outage">Outage</span>
            <div class="incident-body">
                <span class="incident-title">{c["name"]} check failed</span>
                <p class="incident-copy">Locked HTTPS probe returned HTTP {c["http"]} for {c["url"]}.</p>
                <p class="incident-date">{now_display} · {c["id"]}</p>
            </div>
        </article>""")

if incidents:
    incident_html = "\n".join(incidents)
else:
    incident_html = """
            <div class="incident-empty">
                <span class="empty-check" aria-hidden="true">✓</span>
                <p>No recent incidents</p>
            </div>"""

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Status</title>
    <link rel="stylesheet" href="css/site.css" />
</head>
<body>
<section class="hero">
    <div class="wrap">
        <header class="topbar topbar-hero">
            <a class="brand" href="/">
                <span class="mark" aria-hidden="true">S</span>
                <span class="wordmark">Status</span>
            </a>
            <nav>
                <a href="/">Overview</a>
                <a href="#incidents">Incidents</a>
            </nav>
        </header>
        <div class="hero-main">
            <div class="hero-copy">
                <p class="eyebrow">LIVE BUSINESS OPERATIONS</p>
                <h1>Business Systems<br />Status</h1>
                <p class="lede">Every critical system. One clear signal.</p>
            </div>
            <div class="signal-art" aria-hidden="true">
                <span class="signal-ring ring-a"></span>
                <span class="signal-ring ring-b"></span>
                <span class="signal-ring ring-c"></span>
                <span class="signal-core">✓</span>
            </div>
        </div>
    </div>
    <div class="hero-bar"></div>
</section>
<div class="wrap page-body">
    <section class="overall {overall_class}">
        <div class="overall-icon" aria-hidden="true">{overall_glyph}</div>
        <div class="overall-copy">
            <p class="overall-kicker">CURRENT STATUS</p>
            <h2 class="overall-headline">{banner}</h2>
            <p class="overall-meta">Updated {now_display}</p>
        </div>
        <span class="pill pill-{overall_pill}">{overall_label}</span>
    </section>
    <section class="block" id="services">
        <h2>Services</h2>
        {cards("Cloud Cost Agent", "cloud-cost-agent")}
        {cards("DevOps Engineer-in-a-Box", "devops-eia-box")}
    </section>
    <section class="block" id="incidents">
        <h2>Incidents</h2>
        {incident_html}
    </section>
</div>
</body>
</html>
"""
(out / "index.html").write_text(html)
print(f"Wrote {out} azure={azure_code} ado={ado_code} github={github_code} overall={indicator}")
PY

exit 0
