(function () {
  var script = document.currentScript;
  var origin = "";
  if (script && script.src) {
    try { origin = new URL(script.src).origin; } catch (e) { origin = ""; }
  }
  var host = document.getElementById("status-embed") || (script && script.parentNode);
  if (!host) {
    return;
  }

  if (!document.getElementById("status-embed-style")) {
    var style = document.createElement("style");
    style.id = "status-embed-style";
    style.textContent = ".status-embed{font:14px/1.45 Arial,Helvetica,sans-serif;color:#11243f;max-width:360px}.status-embed-kicker{margin:0 0 8px;letter-spacing:.12em;font-size:11px;font-weight:800;color:#64748b}.status-embed-overall{display:flex;justify-content:space-between;gap:10px;margin-bottom:12px}.status-embed-components{list-style:none;margin:0;padding:0}.status-embed-components li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #dce6f1}.status-embed-pill{font-size:12px;font-weight:700}.status-embed-operational{color:#0f9f6e}.status-embed-degraded{color:#b45309}.status-embed-outage{color:#b42318}.status-embed-more{margin:12px 0 0}";
    document.head.appendChild(style);
  }

  function text(el, value) {
    el.textContent = value == null ? "" : String(value);
  }

  function pill(status) {
    var key = "unknown";
    var label = "Unknown";
    if (status === "operational" || status === "none") { key = "operational"; label = "Operational"; }
    else if (status === "degraded_performance" || status === "partial_outage" || status === "minor") { key = "degraded"; label = "Degraded"; }
    else if (status === "major_outage" || status === "major" || status === "critical") { key = "outage"; label = "Outage"; }
    else if (status === "under_maintenance" || status === "maintenance") { key = "maintenance"; label = "Maintenance"; }
    var span = document.createElement("span");
    span.className = "status-embed-pill status-embed-" + key;
    text(span, label);
    return span;
  }

  fetch(origin + "/api/v2/summary.json", { credentials: "omit" })
    .then(function (response) { return response.json(); })
    .then(function (data) {
      host.innerHTML = "";
      var root = document.createElement("div");
      root.className = "status-embed";
      var kicker = document.createElement("p");
      kicker.className = "status-embed-kicker";
      text(kicker, data.page && data.page.name ? data.page.name : "Status");
      var overall = document.createElement("div");
      overall.className = "status-embed-overall";
      var banner = document.createElement("strong");
      text(banner, data.status && data.status.description ? data.status.description : "All Systems Operational");
      overall.appendChild(banner);
      overall.appendChild(pill(data.status && data.status.indicator));
      var list = document.createElement("ul");
      list.className = "status-embed-components";
      (data.components || []).forEach(function (component) {
        if (!component || component.group) { return; }
        var item = document.createElement("li");
        var name = document.createElement("span");
        text(name, component.name);
        item.appendChild(name);
        item.appendChild(pill(component.status));
        list.appendChild(item);
      });
      var more = document.createElement("p");
      more.className = "status-embed-more";
      var link = document.createElement("a");
      link.href = origin || "/";
      link.target = "_blank";
      link.rel = "noopener";
      text(link, "Full status page");
      more.appendChild(link);
      root.appendChild(kicker);
      root.appendChild(overall);
      root.appendChild(list);
      root.appendChild(more);
      host.appendChild(root);
    })
    .catch(function () {
      host.textContent = "Status unavailable";
    });
})();
